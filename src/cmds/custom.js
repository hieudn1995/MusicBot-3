let got = require('got')

module.exports = {
  name: ['sound', 'snd'],
  desc: 'Play a chat sound in the voice channel!',
  permission: [],
  usage: '<query>',
  args: 1,
  command: async function (msg, cmd, args) {
    let Player = global.Player.get(msg)
    if (!Player) return msg.channel.send("You're not in a voice channel!")
    if (Player.channel !== msg.member.voice.channel) {
      return msg.channel.send("You're not in the voice channel!")
    }
    let sound = await getChatsound(args.join(' '))
    if (!sound) return msg.channel.send('Something went wrong!')
    else if (sound.error) return msg.channel.send(sound.error)
    let item = await Player.play(sound, msg.author)
    if (!item) msg.channel.send('Nothing found!')
    else if (item.error) msg.channel.send(item.error)
    else if (Player.active) Player.msgQueued(msg, item)
  }
}

async function getChatsound (query, rnd) {
  try {
    let folder
    if (query.indexOf('/') >= 0) {
      let parts = query.split('/')
      folder = parts.shift()
      query = parts.join('/')
    }
    let url = 'https://purr.now.sh/chatsounds/get'
    let { body } = await got(url, {
      query: {
        q: query,
        f: folder
      },
      json: true
    })
    if (!body || !body.success) return null
    if (!body.body.length) return { error: 'Nothing found!' }
    body = body.body[0]
    let sound = body.path[Math.floor(Math.random() * body.path.length)]
    return {
      type: 'url',
      url: 'https://raw.githubusercontent.com/' + sound,
      title: body.name
    }
  } catch (e) { console.log(e); return null }
}
