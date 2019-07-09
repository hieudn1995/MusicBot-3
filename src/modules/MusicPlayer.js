let got = require('got')
let icy = require('icy')
let ytdl = require('ytdl-core')
let Event = require('events')
let apiGoogle = process.env.API_GOOGLE
let apiSoundCloud = process.env.API_SOUNDCLOUD

class MusicPlayer extends Event {
  constructor (msg) {
    super()
    this.msg = msg
    this.channel = msg.member.voiceChannel
    this.connection = null
    this.queue = []
    this.playing = false
    this.looping = false
  }
}

MusicPlayer.prototype.add = async function (query, author) {
  let item = null
  if (query && !query.type) {
    if (['.mp3', '.mp4', '.ogg', '.wav', '.flac', '.webm'].some(x => query.endsWith(x)) && query.startsWith('http')) {
      item = await getSongData(query)
    } else if (query.indexOf('soundcloud.com/') >= 0) {
      item = await searchSC(query)
    } else {
      item = await searchYT(query)
    }
  } else item = query
  if (item && item.error) return item
  let authorObj = null
  if (author) {
    authorObj = {
      name: `${author.username}#${author.discriminator}`,
      avatar: `https://cdn.discordapp.com/avatars/${author.id}/${author.avatar}.png`,
      id: author.id
    }
  }
  if (item && item.playlist) {
    let items = item.items
    if (!item.playlist.duration) item.playlist.duration = '∞'
    for (let i = 0; i < items.length; i++) {
      items[i].title = decodeEntities(items[i].title)
      items[i].author = authorObj
      items[i].timestamp = Date.now()
      if (!items[i].duration) items[i].duration = '∞'
      this.queue.push(items[i])
    }
    this.emit('queue', item)
    return item
  } else if (item) {
    item.title = decodeEntities(item.title)
    item.author = authorObj
    item.timestamp = Date.now()
    if (!item.duration) item.duration = '∞'
    if (this.queue.length) this.emit('queue', item)
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
    let item = await this.first()
    let disp = null
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
      case 'url': case 'radio': {
        disp = this.connection.playArbitraryInput(item.url)
        break
      }
    }
    if (!disp) return
    disp.on('start', () => {
      this.connection.player.streamingData.pausedTime = 0
      this.playing = true
      this.emit('play', item)
    })
    disp.on('end', () => {
      if (!this.looping) this.queue.shift()
      this.playing = false
      if (this.queue.length) {
        setTimeout(() => this.play(), 1500)
      } else this.emit('end')
    })
  }
  return song
}

MusicPlayer.prototype.first = async function () {
  let item = this.queue[0]
  if (item && item.type === 'radio') {
    let data = await getRadioData(item.url)
    item.radio = data
  }
  return item
}

MusicPlayer.prototype.last = function () {
  return this.queue[this.queue.length - 1]
}

MusicPlayer.prototype.get = function (pos) {
  if (pos === undefined) return this.queue
  pos = Math.abs(parseInt(pos))
  return this.queue[pos]
}

MusicPlayer.prototype.set = function (queue) {
  if (queue) this.queue = queue
}

MusicPlayer.prototype.remove = function (pos) {
  if (pos === undefined) return
  pos = Math.abs(parseInt(pos))
  return this.queue.splice(pos, 1)
}

MusicPlayer.prototype.size = function () {
  return this.queue.length
}

MusicPlayer.prototype.skip = function () {
  if (this.connection) {
    if (this.connection.dispatcher) {
      this.connection.dispatcher.end()
      this.emit('skip')
    }
  }
}

MusicPlayer.prototype.pause = function () {
  if (this.connection) {
    if (this.connection.dispatcher) {
      if (this.connection.dispatcher.paused) {
        this.connection.dispatcher.resume()
        this.emit('pause', false)
        return false
      } else {
        this.connection.dispatcher.pause()
        this.emit('pause', true)
        return true
      }
    }
  }
}

MusicPlayer.prototype.loop = function () {
  if (this.connection) {
    if (this.connection.dispatcher) {
      if (this.looping) {
        this.looping = false
        this.emit('loop', false)
        return false
      } else {
        this.looping = true
        this.emit('loop', true)
        return true
      }
    }
  }
}

MusicPlayer.prototype.reset = function () {
  this.queue = []
  if (this.connection) this.connection.channel.leave()
  this.connection = null
  this.playing = false
  this.looping = false
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

async function searchSC (query) {
  let url = 'http://api.soundcloud.com/resolve.json'
  try {
    let { body } = await got(url, {
      query: {
        url: query,
        client_id: apiSoundCloud
      },
      json: true
    })
    if (body.kind === 'track') {
      return {
        type: 'url',
        title: body.title,
        duration: formatTime(body.duration),
        img: body.artwork_url,
        url: body.stream_url + '?client_id=' + apiSoundCloud,
        link: body.permalink_url
      }
    } else if (body.kind === 'playlist') {
      let items = []
      for (let i = 0; i < body.tracks.length; i++) {
        let item = body.tracks[i]
        items.push({
          type: 'url',
          title: item.title,
          duration: formatTime(item.duration),
          img: item.artwork_url,
          url: item.stream_url + '?client_id=' + apiSoundCloud,
          link: item.permalink_url
        })
      }
      return {
        playlist: {
          title: body.title,
          url: body.permalink_url,
          img: body.artwork_url,
          duration: formatTime(body.duration)
        },
        items: items
      }
    }
  } catch (e) { return null }
}

async function searchYT (query) {
  let url = 'https://www.googleapis.com/youtube/v3/search'
  let payload = {
    part: 'snippet',
    type: 'video',
    maxResults: 1,
    key: apiGoogle,
    q: query
  }
  if (ytdl.validateURL(query) || ytdl.validateID(query)) {
    url = 'https://www.googleapis.com/youtube/v3/videos'
    delete payload.q
    let id = extractYTLinkID(query)
    payload.id = id || query
  }
  let playlistId = extractYTLinkID(query)
  if (playlistId && playlistId.length < 12) playlistId = null
  if (playlistId) {
    let item = await getYTPlaylistVids(playlistId)
    item = await addYTDuration(item)
    return item
  } else {
    try {
      let { body } = await got(url, { query: payload, json: true })
      if (!body.items.length) return null
      let item = body.items[0]
      let thumbnail = null
      if (item.snippet.thumbnails) {
        let keys = Object.keys(item.snippet.thumbnails)
        thumbnail = item.snippet.thumbnails[keys[keys.length - 1]].url
      }
      if (!thumbnail) return null
      let id = item.id.videoId || item.id
      let res = {
        id: id,
        type: 'yt',
        title: item.snippet.title,
        url: 'https://youtube.com/watch?v=' + id,
        img: thumbnail
      }
      res = await addYTDuration(res)
      return res
    } catch (e) {
      if (e) {
        if (e.response.body.error.code === 403) return { error: 'Exceeded quota.' }
        else return null
      }
    }
  }
}

async function addYTDuration (item) {
  try {
    let url = 'https://www.googleapis.com/youtube/v3/videos'
    let total = 0
    if (item.playlist) {
      let ids = item.items.map(x => x.id)
      let getDuration = async (ids, arr = []) => {
        let part = ids.splice(0, 50)
        let { body } = await got(url, {
          query: {
            part: 'contentDetails',
            id: part.join(','),
            fields: 'items/contentDetails/duration',
            key: apiGoogle
          },
          json: true
        })
        total += body.items.map(x => formatYTTime(x.contentDetails.duration)).reduce((a, b) => a + b)
        let times = body.items.map(x => formatTime(formatYTTime(x.contentDetails.duration)))
        arr.push(...times)
        if (ids.length) arr = await getDuration(ids, arr)
        return arr
      }
      let durations = await getDuration(ids)
      item.items = item.items.map(x => {
        x.duration = durations.shift()
        return x
      })
      item.playlist.duration = formatTime(total)
    } else {
      let { body } = await got(url, {
        query: {
          part: 'contentDetails',
          id: item.id,
          fields: 'items/contentDetails/duration',
          key: apiGoogle
        },
        json: true
      })
      item.duration = formatTime(formatYTTime(body.items[0].contentDetails.duration))
    }
    return item
  } catch (e) { return item }
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
        key: apiGoogle
      },
      json: true
    })
    if (!body.items.length) return
    for (let i = 0; i < body.items.length; i++) {
      let item = body.items[i]
      let thumbnail = null
      if (item.snippet.thumbnails) {
        let keys = Object.keys(item.snippet.thumbnails)
        thumbnail = item.snippet.thumbnails[keys[keys.length - 1]].url
      }
      if (!thumbnail) continue
      res.push({
        id: item.snippet.resourceId.videoId,
        type: 'yt',
        title: item.snippet.title,
        url: 'https://youtube.com/watch?v=' + item.snippet.resourceId.videoId,
        img: thumbnail
      })
    }
    next = body.nextPageToken
  } while (next)

  try {
    let url = 'https://www.googleapis.com/youtube/v3/playlists'
    let { body } = await got(url, {
      query: {
        part: 'snippet',
        maxResults: 1,
        playlistId: id,
        key: apiGoogle,
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
    return {
      playlist: {
        title: item.snippet.title,
        url: 'https://www.youtube.com/playlist?list=' + item.id,
        img: thumbnail
      },
      items: res
    }
  } catch (e) { if (e) return null }
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

function getRadioData (url) {
  return new Promise((resolve, reject) => {
    icy.get(url, res => {
      if (res.statusCode !== 200) resolve(null)
      res.on('metadata', metadata => {
        let headers = res.headers
        let name = headers ? headers['icy-name'] : null
        let parsed = icy.parse(metadata)
        let title = parsed ? parsed.StreamTitle : null
        resolve({ name: name, song: title })
      })
    })
  })
}

function formatYTTime (duration) {
  if (!duration) return
  let match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/)
  match = match.slice(1).map(x => x ? x.replace(/\D/, '') : x)
  let hours = (parseInt(match[0]) || 0)
  let minutes = (parseInt(match[1]) || 0)
  let seconds = (parseInt(match[2]) || 0)
  return (hours * 3600 + minutes * 60 + seconds) * 1000
}

module.exports = MusicPlayer
