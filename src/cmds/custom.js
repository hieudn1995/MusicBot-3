let got = require('got')
let apiGithub = process.env.GIT

module.exports = {
  name: ['sound', 'snd'],
  desc: 'Plays a garrysmod chat sound in the voice channel!',
  permission: [],
  usage: '<query>',
  args: 1,
  command: async function (msg, cmd, args) {
    let Player = global.getPlayer(msg)
    if (!Player) {
      msg.channel.send("You're not in a voice channel!")
      return
    }
    let sound = await getChatsound(args.join(' '))
    let item = await Player.play(sound, msg.author)
    if (!item) msg.channel.send('Nothing found!')
    else if (item.error) msg.channel.send(item.error)
    else if (Player.playing) {
      msg.channel.send({
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
}

async function getChatsound (query, rnd) {
  let url = 'https://api.github.com/search/code'
  let { body } = await got(url, {
    headers: { 'User-Agent': 'Jibril' },
    query: {
      q: query.trim() + '+in:path+extension:ogg+path:sound/chatsounds/autoadd+repo:Metastruct/garrysmod-chatsounds',
      access_token: apiGithub
    },
    json: true
  })
  if (!body.total_count) return
  let mod = rnd ? Math.floor(Math.random() * body.items.length) : 0
  return {
    type: 'url',
    url: `https://raw.githubusercontent.com/Metastruct/garrysmod-chatsounds/master/${encodeURIComponent(body.items[mod].path.trim())}`,
    title: body.items[mod].name
  }
}
