let got = require('got')
let ytdl = require('ytdl-core')
let Event = require('events')
let key = process.env.KEY

class MusicPlayer extends Event {
  constructor (msg) {
    super()
    this.msg = msg
    this.channel = msg.member.voiceChannel
    this.connection = null
    this.queue = []
    this.playing = false
  }
}

MusicPlayer.prototype.add = async function (query, author) {
  let item = null
  if (query && !query.type) {
    if (['.mp3', '.mp4', '.ogg', '.wav', '.flac', '.webm'].some(x => query.endsWith(x)) && query.startsWith('http')) {
      item = await getSongData(query)
    } else {
      item = await searchYT(query)
      if (item.error) return item
    }
  } else item = query
  let authorObj = null
  if (author) {
    authorObj = {
      name: `${author.username}#${author.discriminator}`,
      avatar: `https://cdn.discordapp.com/avatars/${author.id}/${author.avatar}.png`
    }
  }
  if (item && item.playlist) {
    let items = item.items
    for (let i = 0; i < items.length; i++) {
      items[i].title = decodeEntities(items[i].title)
      items[i].author = authorObj
      items[i].timestamp = Date.now()
      this.queue.push(items[i])
    }
    this.emit('queued', item)
    return items
  } else if (item) {
    item.title = decodeEntities(item.title)
    item.author = authorObj
    item.timestamp = Date.now()
    if (this.queue.length) this.emit('queued', item)
    this.queue.push(item)
  }
  return item
}

MusicPlayer.prototype.join = async function () {
  if (this.channel) {
    this.connection = await this.channel.join()
    return true
  } else {
    return false
  }
}

MusicPlayer.prototype.play = async function (query, author) {
  if (!this.connection) {
    let success = await this.join()
    if (!success) return null
  }
  let song = query ? await this.add(query, author) : null
  if (song && song.error) return song
  if (!this.playing && this.queue.length) {
    let item = this.first()
    let disp = null
    if (!item.duration) item.duration = '∞'
    switch (item.type) {
      case 'yt': {
        let stream = ytdl(item.url, { filter: 'audioonly' })
        disp = this.connection.playStream(stream)
        break
      }
      case 'stream': {
        disp = this.connection.playStream(item.url)
        break
      }
      case 'file': {
        disp = this.connection.playFile(item.url)
        break
      }
      case 'url': {
        disp = this.connection.playArbitraryInput(item.url)
        break
      }
    }
    disp.on('start', () => {
      this.connection.player.streamingData.pausedTime = 0
      this.playing = true
      this.emit('playing', item)
    })
    disp.on('end', () => {
      this.queue.shift()
      this.playing = false
      if (this.queue.length) {
        setTimeout(() => this.play(), 1500)
      } else this.emit('end')
    })
  }
  return song
}

MusicPlayer.prototype.first = function () {
  return this.queue[0]
}

MusicPlayer.prototype.last = function () {
  return this.queue[this.queue.length - 1]
}

MusicPlayer.prototype.get = function (pos) {
  return this.queue[Math.abs(pos)]
}

MusicPlayer.prototype.remove = function (pos) {
  return this.queue.splice(Math.abs(pos), 1)
}

MusicPlayer.prototype.size = function () {
  return this.queue.length
}

MusicPlayer.prototype.skip = function () {
  if (this.connection) {
    if (this.connection.dispatcher) {
      this.connection.dispatcher.end()
      this.emit('skipped')
    }
  }
}

MusicPlayer.prototype.pause = function () {
  if (this.connection) {
    if (this.connection.dispatcher) {
      if (this.connection.dispatcher.paused) {
        this.connection.dispatcher.resume()
        this.emit('paused', false)
      } else {
        this.connection.dispatcher.pause()
        this.emit('paused', true)
      }
    }
  }
}

MusicPlayer.prototype.reset = function () {
  this.queue = []
  if (this.connection) this.connection.channel.leave()
  this.connection = null
  this.playing = false
  this.emit('reset')
}

MusicPlayer.prototype.volume = function (value) {
  if (value) this.connection.dispatcher.setVolume(value)
  return this.connection.dispatcher.volume
}

MusicPlayer.prototype.time = function () {
  if (!this.connection) return '0:00'
  return formatTime(this.connection.dispatcher.time)
}

async function searchYT (query) {
  let url = 'https://www.googleapis.com/youtube/v3/search'
  let payload = {
    part: 'snippet',
    type: 'video',
    maxResults: 1,
    key: key,
    q: query
  }
  if (ytdl.validateURL(query) || ytdl.validateID(query)) {
    url = 'https://www.googleapis.com/youtube/v3/videos'
    delete payload.q
    let id = extractYTLinkID(query)
    payload.id = id || query
  }
  let playlistId = extractYTLinkID(query)
  if (playlistId) {
    let item = await getYTPlaylistVids(playlistId)
    return item
  } else {
    try {
      let { body } = await got(url, { query: payload, json: true })
      if (!body.items.length) return null
      let item = body.items[0]
      let thumbnail = 'https://i.imgur.com/WBB1NVX.jpg'
      if (item.snippet.thumbnails) {
        let keys = Object.keys(item.snippet.thumbnails)
        thumbnail = item.snippet.thumbnails[keys[keys.length - 1]].url
      }
      return {
        type: 'yt',
        title: item.snippet.title,
        url: 'https://youtube.com/watch?v=' + (item.id.videoId || item.id),
        img: thumbnail
      }
    } catch (e) {
      if (e) {
        if (e.response.body.error.code === 403) return { error: 'Exceeded quota.' }
        else return null
      }
    }
  }
}

async function getYTPlaylistVids (id) {
  let next = ''
  let res = []
  do {
    let url = 'https://www.googleapis.com/youtube/v3/playlistItems'
    let { body } = await got(url, {
      query: {
        part: 'snippet',
        pageToken: next,
        maxResults: 50,
        playlistId: id,
        key: key
      },
      json: true
    })
    if (!body.items.length) return
    for (let i = 0; i < body.items.length; i++) {
      let item = body.items[i]
      let thumbnail = 'https://i.imgur.com/WBB1NVX.jpg'
      if (item.snippet.thumbnails) {
        let keys = Object.keys(item.snippet.thumbnails)
        thumbnail = item.snippet.thumbnails[keys[keys.length - 1]].url
      }
      res.push({
        type: 'yt',
        title: item.snippet.title,
        url: 'https://youtube.com/watch?v=' + item.snippet.resourceId.videoId,
        img: thumbnail
      })
    }
    next = body.nextPageToken
  } while (next)

  let info = null
  try {
    let url = 'https://www.googleapis.com/youtube/v3/playlists'
    let { body } = await got(url, {
      query: {
        part: 'snippet',
        maxResults: 1,
        playlistId: id,
        key: key,
        id: id
      },
      json: true
    })
    let item = body.items[0]
    let thumbnail = 'https://i.imgur.com/WBB1NVX.jpg'
    if (item.snippet.thumbnails) {
      let keys = Object.keys(item.snippet.thumbnails)
      thumbnail = item.snippet.thumbnails[keys[keys.length - 1]].url
    }
    info = {
      id: item.id,
      title: item.snippet.title,
      url: 'https://www.youtube.com/playlist?list=' + item.id,
      img: thumbnail
    }
  } catch (e) { if (e) return null }
  return { playlist: info, items: res }
}

async function getSongData (url) {
  return {
    type: 'url',
    title: url,
    url: url,
    img: null
  }
}

function extractYTLinkID (query) {
  let regex = /^(?:https?:\/\/)?(?:www\.)?youtu\.?be(?:\.com)?.*?(?:v|list)=(.*?)(?:&|$)|^(?:https?:\/\/)?(?:www\.)?youtu\.?be(?:\.com)?(?:(?!=).)*\/(.*)$/g
  let match = regex.exec(query)
  return match ? match[1] : null
}

function formatTime (ms) {
  let t = new Date(ms).toISOString().substr(11, 8).split(':')
  let h = Math.floor(ms / 1000 / 60 / 60).toString()
  if (h > 23) t[0] = h
  while (t.length > 2 && t[0] === '00' && t[1].startsWith('0')) {
    t.shift()
  }
  if (t.length > 2 && t[0] === '00') t.shift()
  if (t[0].startsWith('0')) t[0] = t[0].substr(1)
  return t.join(':')
}

function decodeEntities (str) {
  if (!str) return
  let translate = { nbsp: ' ', amp: '&', quot: '"', lt: '<', gt: '>' }
  return str
    .replace(/&(nbsp|amp|quot|lt|gt);/g, (m, e) => translate[e])
    .replace(/&#(\d+);/gi, (m, e) => String.fromCharCode(parseInt(e, 10)))
}

module.exports = MusicPlayer
