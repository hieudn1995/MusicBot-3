# MusicBot
Simple Discord Music Bot

~~Made this because [Jibril's](https://github.com/bakapear/Jibril) music code is a mess.~~
[Jibril](https://github.com/bakapear/Jibril) now uses this MusicPlayer Module.

Still not done yet like almost all of my projects xd

## Example Usage

##### index.js
```js
let Discord = require('discord.js')
let bot = new Discord.Client()

let MusicPlayer = require('./modules/MusicPlayer')

Player = new MusicPlayer(bot, { color: 4360181 })

bot.on('ready', () => {
  bot.guilds.array().map(x => Player.init(x.id))
  console.log('Bot is running!')
})
bot.on('guildCreate', guild => Player.init(guild.id))
bot.on('guildDelete', guild => Player.strike(guild.id))

bot.login(token)
...
```
##### playSong.js
```js
let Player = global.Player.get(msg)
if (!Player) return msg.channel.send("You're not in a voice channel!")
if (Player.channel !== msg.member.voice.channel) {
  return msg.channel.send("You're not in the voice channel!")
}

let item = await Player.play(query, msg.author)
if (!item) msg.channel.send('Nothing found!')
else if (item.error) msg.channel.send(item.error)
else if (item.playlist || Player.active) Player.msgQueued(msg, item)
```