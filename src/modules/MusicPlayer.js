let got = require('got')
let icy = require('icy')
let ytdl = require('ytdl-core')
let ffprobe = require('ffprobe-url')
let Event = require('events')
let apiGoogle = process.env.API_GOOGLE
let apiSoundCloud = process.env.API_SOUNDCLOUD

let DISPLAY = [
  'MINI', // Minified output
  'SILENT', // Console output only
  'HIDDEN' // No output
]

let FLAGS = {
  1: 'LEAVE_ON_QUEUE_END',
  2: 'LEAVE_ON_CHANNEL_EMPTY',
  4: 'DELETE_ITEM_MESSAGE_ON_ITEM_END',
  8: 'REMOVE_USER_ITEMS_ON_USER_LEAVE',
  16: 'MESSAGES_TEMPORARY',
  32: 'FAIR_MODE'
}

class MusicPlayer extends Event {
  constructor (bot, opts, next) {
    super()
    if (!next) {
      this.init = function (guild) {
        if (this[guild]) return
        this[guild] = new MusicPlayer(bot, opts, true)
        let Player = this[guild]
        Player.on('play', item => Player.msgPlaying(Player.msg, item))
        return Player
      }
      this.strike = function (guild) {
        if (!this[guild]) return
        delete this[guild]
      }
      this.get = function (msg, checkOnly) {
        let Player = this[msg.guild.id]
        if (!Player) Player = this.init(msg.guild.id)
        if (Player.channel || checkOnly) return Player
        if (!Player.join(msg)) return null
        return Player
      }
      this.flags = FLAGS
      this.display = DISPLAY
    } else {
      this.display = DISPLAY.indexOf(`${opts.display}`.toLowerCase()) + 1
      this.flags = {
        i: opts.flags || 0,
        get: t => {
          let r = Object.keys(FLAGS).filter(x => x & this.flags.i).map(x => FLAGS[x])
          if (t === undefined) return r
          else return r.includes(t)
        }
      }
      this.color = opts.color || null
      this.connection = null
      this.playing = false
      this.looping = false
      this.channel = null
      this.active = false
      this.members = []
      this.timers = []
      this.last = null
      this.msg = null
      this.queue = []

      this.msgPlaying = (org, item, skip) => {
        let getTime = () => `${this.time()}/${item.duration}`
        if (this.display === 3) return
        if (item.radio) {
          let text = `NP: ${item.radio.title} [${getTime()}]`
          if (this.display === 2) console.log(text)
          else if (this.display === 1) org.channel.send(text).then(m => { if (!skip) this.last = m })
          else {
            org.channel.send({
              embed: {
                title: 'Listening to ' + item.radio.name,
                color: this.color,
                url: item.nolink ? undefined : item.link || item.url,
                description: `\`${item.radio.song}\``,
                thumbnail: { url: item.img },
                footer: {
                  icon_url: item.author.avatar,
                  text: `${item.author.name} • ${getTime()}`
                }
              }
            }).then(m => { if (!skip) this.last = m })
          }
        } else {
          let text = `NP: ${item.title} [${getTime()}]`
          if (this.display === 2) console.log(text)
          else if (this.display === 1) org.channel.send(text).then(m => { if (!skip) this.last = m })
          else {
            let error = ''
            if (item.streamError) error = `\n\n${item.streamError}`
            org.channel.send({
              embed: {
                title: 'Now Playing',
                color: this.color,
                url: item.nolink ? undefined : item.link || item.url,
                description: `\`${item.title}\`` + error,
                thumbnail: { url: item.img },
                footer: {
                  icon_url: item.author.avatar,
                  text: `${item.author.name} • ${getTime()}`
                }
              }
            }).then(m => { if (!skip) this.last = m })
          }
        }
      }
      this.msgQueued = (org, item) => {
        if (this.display === 3) return
        if (item.playlist) {
          let text = `Q: ${item.playlist.title} (${item.items.length}) [${item.playlist.duration}]`
          if (this.display === 2) console.log(text)
          else if (this.display === 1) org.channel.send(text).then(this.processMsg)
          else {
            let items = item.items
            org.channel.send({
              embed: {
                title: `Added ${items.length} Item${items.length > 1 ? 's' : ''} to Queue`,
                color: this.color,
                url: item.playlist.url,
                description: `\`${item.playlist.title}\``,
                thumbnail: { url: item.playlist.img },
                footer: {
                  icon_url: items[0].author.avatar,
                  text: `${items[0].author.name} • ${item.playlist.duration}`
                }
              }
            }).then(this.processMsg)
          }
        } else {
          let text = `Q: ${item.title} [${item.duration}]`
          if (this.display === 2) console.log(text)
          else if (this.display === 1) org.channel.send(text).then(this.processMsg)
          else {
            org.channel.send({
              embed: {
                title: `Added To Queue (Position: ${this.queue.indexOf(item)})`,
                color: this.color,
                url: item.nolink ? undefined : item.link || item.url,
                description: `\`${item.title}\``,
                thumbnail: { url: item.img },
                footer: {
                  icon_url: item.author.avatar,
                  text: `${item.author.name} • ${item.duration}`
                }
              }
            }).then(this.processMsg)
          }
        }
      }
      this.processMsg = m => {
        if (m && this.flags.get('MESSAGES_TEMPORARY')) {
          return new Promise((resolve, reject) => {
            setTimeout(() => {
              m.delete()
              resolve(false)
            }, 5000)
          })
        } else return true
      }
      this.on('skip', () => this.next())
      this.on('finish', () => {
        if (this.flags.get('LEAVE_ON_QUEUE_END')) {
          this.reset()
        }
      })
      this.on('end', () => {
        if (this.last && this.flags.get('DELETE_ITEM_MESSAGE_ON_ITEM_END')) {
          this.last.delete()
        }
      })
      bot.on('voiceStateUpdate', (oldm, newm) => {
        if (this.msg) this.connection = bot.voice.connections.find(x => x.channel.guild.id === this.msg.guild.id)
        if (this.connection) {
          this.channel = this.connection.channel
          if (this.channel.members.size === 1) {
            if (this.flags.get('LEAVE_ON_CHANNEL_EMPTY')) {
              this.reset()
            }
          }
          if (oldm.channel === this.channel && newm.channel !== oldm.channel) {
            if (this.size() && this.flags.get('REMOVE_USER_ITEMS_ON_USER_LEAVE')) {
              let old = this.timers.find(x => x.id === oldm.id)
              if (old) old.destroy()
              let item = { id: oldm.id }
              item.destroy = () => {
                let index = this.timers.findIndex(x => x.id === item.id)
                if (index >= 0) {
                  clearTimeout(this.timers[index].timer)
                  this.timers.splice(index, 1)
                }
              }
              item.timer = setTimeout(() => {
                if (this.size() && !this.members.includes(oldm.id)) {
                  let first = this.queue.shift()
                  this.queue = this.queue.filter(x => x.author.id !== oldm.id)
                  this.queue.unshift(first)
                  let author = bot.users.find(x => x.id === oldm.id)
                  if (author) this.msg.channel.send(`Removed \`${author.username}#${author.discriminator}\`'s items because they left the channel for too long.`)
                }
                item.destroy()
              }, 60000)
              this.timers.push(item)
            }
          }
        }
        if (this.channel) {
          let members = this.channel.members.array().map(x => x.id).filter(x => x !== bot.user.id)
          this.members = members
        }
      })
    }
  }
}

MusicPlayer.prototype.size = function () {
  return this.queue.length
}

MusicPlayer.prototype.add = async function (query, author) {
  let item = null
  if (query && query.error) item = { error: query.error }
  else if (query && !query.type) {
    if (validURL(query)) {
      if (query.indexOf('soundcloud.com/') >= 0) {
        item = await searchSC(query)
      } else if (query.indexOf('youtu.be/') >= 0 || query.indexOf('youtube.com/') >= 0) {
        item = await searchYT(query)
      } else {
        item = await getItemData(query)
      }
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
      this.update(items[i])
    }
    this.emit('queue', item)
    return item
  } else if (item) {
    item.title = decodeEntities(item.title)
    item.author = authorObj
    item.timestamp = Date.now()
    if (!item.duration) {
      if (item.type === 'radio' || !validURL(item.url)) item.duration = '∞'
      else {
        let info = await ffprobe(item.url)
        if (info.format.tags) {
          let title = info.format.tags.title
          let artist = info.format.tags.artist
          if (title && artist) item.title = `${artist} - ${title}`
          else if (title) item.title = title
        }
        item.duration = formatTime(info.format.duration * 1000)
      }
    }
    if (this.size()) this.emit('queue', item)
    this.update(item)
  }
  return item
}

MusicPlayer.prototype.join = async function (msg) {
  this.msg = msg
  this.channel = msg.member.voice.channel
  if (this.channel) {
    this.connection = await this.channel.join()
    return true
  } else {
    return false
  }
}

MusicPlayer.prototype.play = async function (query, author) {
  if (!this.connection) {
    let success = await this.join(this.msg)
    if (!success) return null
  }
  let item = query ? await this.add(query, author) : null
  if (item && item.error) return item
  if (!this.playing && this.size()) {
    let first = await this.first()
    let disp = null
    let strm = null
    switch (first.type) {
      case 'yt': {
        let stream = ytdl(first.url, { filter: 'audioonly' })
        strm = stream
        disp = this.connection.play(stream)
        break
      }
      case 'stream': case 'file': case 'url': case 'radio': {
        disp = this.connection.play(first.url)
        break
      }
    }
    if (!disp) return
    if (strm) {
      strm.on('error', e => {
        this.connection.player.streamingData.pausedTime = 0
        this.active = true
        this.playing = true
        first.streamError = e.message.substr(e.message.indexOf(': ') + 2)
        this.emit('play', first)
        setTimeout(() => this.next(), 500)
      })
    }
    disp.on('start', () => {
      this.connection.player.streamingData.pausedTime = 0
      this.active = true
      this.playing = true
      this.emit('play', first)
    })
    disp.on('finish', () => {
      this.emit('end')
      this.next()
    })
  }
  return item
}

MusicPlayer.prototype.next = function () {
  if (!this.looping) this.queue.shift()
  this.playing = false
  if (this.size()) {
    setTimeout(() => this.play(), 500)
  } else {
    this.active = false
    this.emit('finish')
  }
}

MusicPlayer.prototype.first = async function () {
  let item = this.queue[0]
  if (item && item.type === 'radio') {
    let data = await getRadioData(item.url)
    item.radio = data
  }
  return item
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
  return this.queue.splice(pos, 1)[0]
}

MusicPlayer.prototype.skip = function () {
  if (this.connection) {
    if (this.connection.dispatcher) {
      this.connection.dispatcher.destroy()
      this.emit('end')
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
        this.connection.dispatcher.pause(true)
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
  this.timers.forEach(x => x.destroy())
  this.connection = null
  this.looping = false
  this.playing = false
  this.channel = null
  this.active = false
  this.members = []
  this.last = null
  this.msg = null
  this.emit('reset')
}

MusicPlayer.prototype.volume = function (value) {
  if (value) this.connection.dispatcher.setVolume(value)
  return this.connection.dispatcher.volume
}

MusicPlayer.prototype.time = function () {
  if (!this.connection || !this.connection.dispatcher) return '0:00'
  return formatTime(this.connection.dispatcher.streamTime)
}

MusicPlayer.prototype.update = function (item) {
  if (!this.flags.get('FAIR_MODE')) {
    this.queue.push(item)
    return
  }
  let cuts = []
  let size = 0
  for (let i = 0; i < this.size(); i++) {
    let cur = this.members.indexOf(this.queue[i].author.id)
    let next = (i + 1) >= this.size() ? -1 : this.members.indexOf(this.queue[i + 1].author.id)
    if (next <= cur) {
      let stack = this.queue.slice(size, i + 1)
      size += stack.length
      cuts.push(stack)
    }
  }
  let index = cuts.findIndex(x => !x.map(y => y.author.id).includes(item.author.id))
  if (index === -1) index = cuts.length - 1
  if (index === -1) cuts.push(item)
  else {
    let put = 0
    let pos = this.members.indexOf(item.author.id)
    for (let i = 0; i < cuts[index].length; i++) {
      let cur = this.members.indexOf(cuts[index][i].author.id)
      if (cur <= pos) put++
    }
    cuts[index].splice(put, 0, item)
  }
  this.queue = [].concat.apply([], cuts)
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

async function getItemData (url) {
  let success = await got(url).catch(e => { return null })
  if (!success) return null
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

function validURL (str) {
  let pattern = new RegExp('^(https?:\\/\\/)?' +
    '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|' +
    '((\\d{1,3}\\.){3}\\d{1,3}))' +
    '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*' +
    '(\\?[;&a-z\\d%_.~+=-]*)?' +
    '(\\#[-a-z\\d_]*)?$', 'i')
  return !!pattern.test(str)
}

module.exports = MusicPlayer
