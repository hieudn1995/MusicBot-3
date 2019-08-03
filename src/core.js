/* global Player:writable */
let cfg = { token: process.env.BOT_TOKEN, prefix: '>' }
let Discord = require('discord.js')
let path = require('path')
let fs = require('fs')
let bot = new Discord.Client()
let MusicPlayer = require('./modules/MusicPlayer')

Player = new MusicPlayer(bot, { color: 4360181 })

bot.on('ready', () => {
  bot.guilds.array().map(x => Player.init(x.id))
  console.log('Woof! I am barking around.')
})
bot.on('guildCreate', guild => Player.init(guild.id))
bot.on('guildDelete', guild => Player.strike(guild.id))

bot.on('message', async msg => {
  if (!msg.content.startsWith(cfg.prefix)) return
  let args = msg.content.split(' ')
  let cmd = args.shift().substr(1).toLowerCase()
  handleCommand(msg, cmd, args)
})

process.on('SIGINT', () => {
  bot.destroy()
  process.exit()
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
