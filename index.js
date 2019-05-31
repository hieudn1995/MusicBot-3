let ytdl = require('ytdl-core')
let got = require('got')
let cfg = require('./config.json')
let Discord = require('discord.js')
let bot = new Discord.Client()

let queue = {}

bot.on('ready', () => console.log('Woof.'))

bot.on('message', msg => {
  if (!queue[msg.guild.id]) queue[msg.guild.id] = { songs: [], playing: false }
  if (!msg.content.startsWith(cfg.prefix)) return
  let args = msg.content.split(' ')
  let cmd = args.shift().substr(1).toLowerCase()
  cmd = checkShorts(cmd)
  if (action[cmd]) action[cmd](msg, args)
})

function checkShorts (cmd) {
  switch (cmd) {
    case 'p': return 'play'
    case 'n': case 'next': return 'skip'
    case 'np': return 'nowplaying'
    case 'q': return 'queue'
    case 's': return 'stop'
    default: return cmd
  }
}

let action = {
  play: async (msg, args) => {
    if (!args.length) {
      msg.channel.send(`Usage: \`${cfg.prefix}play <query>\``)
      return
    }
    let conn = bot.voiceConnections.find(x => x.channel.id === msg.member.voiceChannelID)
    if (!conn) {
      let vc = msg.member.voiceChannel
      if (vc) {
        conn = await vc.join()
      } else {
        msg.channel.send("You're not in a voice channel!")
        return
      }
    }
    let song = await searchYT(args.join(' '))
    if (!song) {
      msg.channel.send('Nothing found!')
      return
    }
    if (!queue[msg.guild.id].songs.length) {
      queue[msg.guild.id].songs.push(song)
      let playQueue = () => {
        let stream = ytdl(queue[msg.guild.id].songs[0].url, { filter: 'audioonly' })
        let disp = conn.playStream(stream)
        disp.on('start', () => {
          conn.player.streamingData.pausedTime = 0
          queue[msg.guild.id].playing = true
          msg.channel.send(`Now Playing: \`${queue[msg.guild.id].songs[0].title}\``)
        })
        disp.on('end', () => {
          queue[msg.guild.id].songs.shift()
          queue[msg.guild.id].playing = false
          if (queue[msg.guild.id].songs.length) {
            setTimeout(() => playQueue(), 1500)
          }
        })
      }
      playQueue()
    } else {
      queue[msg.guild.id].songs.push(song)
      msg.channel.send(`Added To Queue: \`${song.title}\``)
    }
  },
  skip: async (msg, args) => {
    let conn = bot.voiceConnections.find(x => x.channel.id === msg.member.voiceChannelID)
    if (conn) {
      if (conn.dispatcher) {
        conn.dispatcher.end()
      } else msg.channel.send('Nothing is playing!')
    } else msg.channel.send("I'm not in a voice channel!")
  },
  nowplaying: async (msg, args) => {
    let conn = bot.voiceConnections.find(x => x.channel.id === msg.member.voiceChannelID)
    if (conn) {
      if (queue[msg.guild.id].playing) {
        let song = queue[msg.guild.id].songs[0]
        msg.channel.send({
          embed: {
            title: 'Now Playing',
            description: `\`${song.title}\``,
            thumbnail: { url: song.img }
          }
        })
      } else msg.channel.send('Nothing is playing!')
    } else msg.channel.send("I'm not in a voice channel!")
  },
  queue: async (msg, args) => {
    let conn = bot.voiceConnections.find(x => x.channel.id === msg.member.voiceChannelID)
    if (conn) {
      if (queue[msg.guild.id].songs.length) {
        let songlist = []
        let len = queue[msg.guild.id].songs.length
        let limit = 11
        if (len > limit) len = limit
        for (let i = 0; i < len; i++) {
          let num = (i === 0) ? 'NP:' : i + '.'
          let title = queue[msg.guild.id].songs[i].title
          if (title.length > 65) title = title.substr(0, 62) + '...'
          songlist.push(`${num} \`${title}\``)
        }
        if (queue[msg.guild.id].songs.length > limit) {
          songlist.push(`And ${queue[msg.guild.id].songs.length - len} more...`)
        }
        msg.channel.send({
          embed: {
            title: `Queue (${queue[msg.guild.id].songs.length} Songs)`,
            description: songlist.join('\r\n')
          }
        })
      } else msg.channel.send('Queue is empty!')
    } else msg.channel.send("I'm not in a voice channel!")
  },
  stop: async (msg, args) => {
    let conn = bot.voiceConnections.find(x => x.channel.id === msg.member.voiceChannelID)
    if (conn) {
      let vc = msg.member.voiceChannel
      if (vc) {
        await vc.leave()
        queue[msg.guild.id] = { songs: [], playing: false }
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
    title: item.snippet.title,
    url: 'https://youtube.com/watch?v=' + item.id.videoId,
    img: item.snippet.thumbnails.high.url
  }
}

if (process.env.DEBUG) {
  cfg = { token: process.env.TOKEN, key: process.env.KEY, prefix: '>' }
}

bot.login(cfg.token)
