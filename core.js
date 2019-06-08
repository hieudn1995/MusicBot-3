let ytdl = require('ytdl-core')
let got = require('got')
let cfg = require('./config.json')
let Discord = require('discord.js')
let bot = new Discord.Client()

let voice = {}

bot.on('ready', () => console.log('Woof.'))

bot.on('message', msg => {
  if (!voice[msg.guild.id]) voice[msg.guild.id] = { songs: [], playing: false }
  if (!msg.content.startsWith(cfg.prefix)) return
  let args = msg.content.split(' ')
  let cmd = args.shift().substr(1).toLowerCase()
  cmd = checkShorts(cmd)
  let conn = bot.voiceConnections.find(x => x.channel.id === msg.member.voiceChannelID)
  if (action[cmd]) action[cmd](conn, msg, args)
})

function checkShorts (cmd) {
  switch (cmd) {
    case 'p': return 'play'
    case 'n': case 'next': return 'skip'
    case 't': return 'pause'
    case 'np': return 'nowplaying'
    case 'q': return 'queue'
    case 's': return 'stop'
    default: return cmd
  }
}

let action = {
  play: async (conn, msg, args) => {
    if (!args.length) {
      msg.channel.send(`Usage: \`${cfg.prefix}play <query>\``)
      return
    }
    if (!conn) {
      let vc = msg.member.voiceChannel
      if (vc) {
        conn = await vc.join()
      } else {
        msg.channel.send("You're not in a voice channel!")
        return
      }
    }
    let queue = voice[msg.guild.id]
    let song = null
    let endings = ['.mp3', '.mp4', '.ogg', '.wav', '.flac']
    if (endings.some(x => args.join(' ').endsWith(x))) {
      song = await getSongData(args.join(' '))
    } else {
      song = await searchYT(args.join(' '))
    }
    if (!song) {
      msg.channel.send('Nothing found!')
      return
    }
    song.timestamp = Date.now()
    song.author = {
      name: `${msg.author.username}#${msg.author.discriminator}`,
      avatar: `https://cdn.discordapp.com/avatars/${msg.author.id}/${msg.author.avatar}.png`
    }
    if (!queue.songs.length) {
      queue.songs.push(song)
      let playQueue = () => {
        let disp = null
        song = queue.songs[0]
        switch (song.type) {
          case 'yt': {
            let stream = ytdl(song.url, { filter: 'audioonly' })
            disp = conn.playStream(stream)
            break
          }
          case 'file': {
            disp = conn.playFile(song.url)
            break
          }
          case 'url': {
            disp = conn.playArbitraryInput(song.url)
            break
          }
        }
        disp.on('start', () => {
          conn.player.streamingData.pausedTime = 0
          queue.playing = true
          msg.channel.send(getSongMessage(queue, 'np'))
        })
        disp.on('end', () => {
          queue.songs.shift()
          queue.playing = false
          if (queue.songs.length) {
            setTimeout(() => playQueue(), 1500)
          }
        })
      }
      playQueue()
    } else {
      queue.songs.push(song)
      msg.channel.send(getSongMessage(queue, 'add'))
    }
  },
  skip: async (conn, msg, args) => {
    if (conn) {
      if (conn.dispatcher) {
        conn.dispatcher.end()
      } else msg.channel.send('Nothing is playing!')
    } else msg.channel.send("I'm not in a voice channel!")
  },
  pause: async (conn, msg, args) => {
    if (conn) {
      if (conn.dispatcher) {
        if (conn.dispatcher.paused) {
          conn.dispatcher.resume()
          msg.channel.send('Unpaused player!')
        } else {
          conn.dispatcher.pause()
          msg.channel.send('Paused player!')
        }
      } else msg.channel.send('Nothing is playing!')
    } else msg.channel.send("I'm not in a voice channel!")
  },
  nowplaying: async (conn, msg, args) => {
    if (conn) {
      let queue = voice[msg.guild.id]
      if (queue.playing) {
        msg.channel.send(getSongMessage(queue, 'np', true))
      } else msg.channel.send('Nothing is playing!')
    } else msg.channel.send("I'm not in a voice channel!")
  },
  queue: async (conn, msg, args) => {
    if (conn) {
      let queue = voice[msg.guild.id]
      if (queue.songs.length) {
        msg.channel.send(getSongMessage(queue, 'queue'))
      } else msg.channel.send('Queue is empty!')
    } else msg.channel.send("I'm not in a voice channel!")
  },
  stop: async (conn, msg, args) => {
    if (conn) {
      let vc = msg.member.voiceChannel
      if (vc) {
        await vc.leave()
        voice[msg.guild.id] = { songs: [], playing: false }
      } else msg.channel.send("You're not in a voice channel!")
    } else msg.channel.send("I'm not in a voice channel!")
  }
}

async function searchYT (query) {
  let url = 'https://www.googleapis.com/youtube/v3/search'
  let body = (await got(url, {
    query: {
      part: 'snippet',
      type: 'video',
      maxResults: 1,
      key: cfg.key,
      q: query
    },
    json: true
  })).body
  if (!body.items.length) return null
  let item = body.items[0]
  return {
    type: 'yt',
    title: item.snippet.title,
    url: 'https://youtube.com/watch?v=' + item.id.videoId,
    img: item.snippet.thumbnails.high.url
  }
}

async function getSongData (url) {
  return {
    type: 'url',
    title: url,
    url: url,
    img: null
  }
}

function getSongMessage (queue, type, any) {
  let msg = ''
  switch (type) {
    case 'np': {
      let song = queue.songs[0]
      msg = {
        embed: {
          title: 'Now Playing',
          url: song.url,
          description: `\`${song.title}\``,
          thumbnail: { url: song.img },
          timestamp: song.timestamp,
          footer: {
            icon_url: song.author.avatar,
            text: song.author.name
          }
        }
      }
      if (any === true) {
        delete msg.embed.thumbnail
        msg.embed.image = { url: song.img }
      }
      break
    }
    case 'add': {
      let song = queue.songs[queue.songs.length - 1]
      msg = {
        embed: {
          title: 'Added To Queue',
          url: song.url,
          description: `\`${song.title}\``,
          thumbnail: { url: song.img },
          timestamp: song.timestamp,
          footer: {
            icon_url: song.author.avatar,
            text: song.author.name
          }
        }
      }
      break
    }
    case 'queue': {
      let songlist = []
      let len = queue.songs.length
      let limit = 11
      if (len > limit) len = limit
      for (let i = 0; i < len; i++) {
        let num = (i === 0) ? 'NP:' : i + '.'
        let title = queue.songs[i].title
        if (title.length > 65) title = title.substr(0, 62) + '...'
        songlist.push(`${num} \`${title}\``)
      }
      if (queue.songs.length > limit) {
        songlist.push(`And ${queue.songs.length - len} more...`)
      }
      msg = {
        embed: {
          title: `Queue (${queue.songs.length} Item${queue.songs.length > 1 ? 's' : ''})`,
          description: songlist.join('\r\n')
        }
      }
      break
    }
  }
  return msg
}

if (process.env.TOKEN && process.env.KEY) {
  cfg = { token: process.env.TOKEN, key: process.env.KEY, prefix: '>' }
}

bot.login(cfg.token)
