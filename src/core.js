let cfg = { token: process.env.TOKEN, key: process.env.KEY, prefix: '>' }
let Discord = require('discord.js')
let path = require('path')
let fs = require('fs')
let bot = new Discord.Client()
let MusicPlayer = require('./modules/MusicPlayer')

global.Player = {}
global.getPlayer = (msg, checkOnly) => {
  let Player = global.Player
  if (checkOnly) return Player.hasOwnProperty(msg.guild.id) && Player[msg.guild.id].connection ? Player[msg.guild.id] : null
  if (Player.hasOwnProperty(msg.guild.id)) return Player[msg.guild.id]
  else {
    if (!msg.member.voiceChannel) return null
    let Player = new MusicPlayer(msg)
    Player.msgPlaying = (org, item) => {
      org.channel.send({
        embed: {
          title: 'Now Playing',
          url: item.url,
          description: `\`${item.title}\``,
          thumbnail: { url: item.img },
          footer: {
            icon_url: item.author.avatar,
            text: `${item.author.name} • ${Player.time()}/${item.duration}`
          }
        }
      })
    }
    Player.msgQueued = (org, item) => {
      if (item.playlist) {
        let items = item.items
        org.channel.send({
          embed: {
            title: `Added ${items.length} Item${items.length > 1 ? 's' : ''} to Queue`,
            url: item.playlist.url,
            description: `\`${item.playlist.title}\``,
            thumbnail: { url: item.playlist.img },
            timestamp: items[0].timestamp,
            footer: {
              icon_url: items[0].author.avatar,
              text: items[0].author.name
            }
          }
        })
      } else {
        org.channel.send({
          embed: {
            title: 'Added To Queue',
            url: item.url,
            description: `\`${item.title}\``,
            thumbnail: { url: item.img },
            timestamp: item.timestamp,
            footer: {
              icon_url: item.author.avatar,
              text: item.author.name
            }
          }
        })
      }
    }
    Player.on('playing', item => Player.msgPlaying(Player.msg, item))
    global.Player[msg.guild.id] = Player
    return Player
  }
}

bot.on('ready', () => console.log('Woof.'))

bot.on('message', async msg => {
  if (!msg.content.startsWith(cfg.prefix)) return
  let args = msg.content.split(' ')
  let cmd = args.shift().substr(1).toLowerCase()
  handleCommand(msg, cmd, args)
})

function handleCommand (msg, cmd, args) {
  let files = getFileData(path.join(__dirname, 'cmds'))
  for (let i = 0; i < files.length; i++) {
    if (files[i].guilds && files[i].guilds.length && !files[i].guilds.includes(msg.guild.id)) continue
    if (files[i].name.includes(cmd)) {
      if (files[i].permission !== '' && !msg.member.permissions.has(files[i].permission)) {
        msg.channel.send('Invalid permissions!')
        return
      }
      if (files[i].args > args.length) {
        msg.channel.send(`Usage: \`${msg.content[0]}${cmd} ${files[i].usage}\``)
        return
      }
      if (!msg.member) {
        msg.member = {}
        msg.member.voiceChannel = null
      }
      files[i].command(msg, cmd, args)
      return
    }
  }
}

function getFileData (dir) {
  let files = getAllFiles(dir)
  let data = []
  for (let i = 0; i < files.length; i++) {
    data.push(require(`${files[i]}`))
  }
  return data
}

function getAllFiles (dir) {
  return fs.readdirSync(dir).reduce((files, file) => {
    let name = path.join(dir, file)
    let isDirectory = fs.statSync(name).isDirectory()
    return isDirectory ? [...files, ...getAllFiles(name)] : [...files, name]
  }, [])
}

bot.login(cfg.token)
