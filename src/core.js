/* global Player:writable */
let fs = require('fs')
let readline = require('readline')
let Discord = require('discord.js')
let path = require('path')
let bot = new Discord.Client()

loadEnv()
let cfg = { token: process.env.BOT_TOKEN, prefix: '>' }
let MusicPlayer = require('./modules/MusicPlayer')

Player = new MusicPlayer(bot, { color: 4360181, flags: 32 + 8 })

bot.on('ready', () => {
  console.log('Woof! I am barking around.')
  userInput()
})

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

function loadEnv () {
  let file = fs.readFileSync('.env', { encoding: 'utf-8' })
  let lines = file.split('\r\n').filter(x => x.trim() !== '')
  lines.forEach(x => {
    let parts = x.split('=')
    let key = parts.shift()
    let value = parts.join('=')
    process.env[key] = value
  })
}

function userInput () {
  let rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  rl.on('line', async data => {
    data = data.trim()
    if (data === 'quit') {
      bot.destroy()
      process.exit()
    } else if (data === 'restart') {
      Player.reset()
      await bot.destroy()
      bot.login(cfg.token)
      rl.close()
    } else if (data === 'clear') {
      var lines = process.stdout.getWindowSize()[1]
      for (var i = 0; i < lines; i++) {
        console.log('\r\n')
      }
    } else {
      try {
        // eslint-disable-next-line no-eval
        console.log(eval(data))
      } catch (e) {
        console.error(`\x1b[31m${e.message}\x1b[0m`)
      }
    }
  })
}

bot.login(cfg.token)
