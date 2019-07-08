module.exports = {
  name: ['nowplaying', 'np'],
  desc: 'Shows current song in queue.',
  permission: [],
  usage: '',
  args: 0,
  command: async function (msg, cmd, args) {
    let Player = global.getPlayer(msg, true)
    if (!Player || !Player.size() || !Player.playing) {
      msg.channel.send('Nothing is playing right now!')
      return
    }
    let item = await Player.first()
    if (item.radio) {
      msg.channel.send({
        embed: {
          title: 'Listening to ' + item.radio.name,
          url: item.url,
          description: `\`${item.radio.song}\``,
          image: { url: item.img },
          footer: {
            icon_url: item.author.avatar,
            text: `${item.author.name} • ${Player.time()}/${item.duration}`
          }
        }
      })
    } else {
      msg.channel.send({
        embed: {
          title: 'Now Playing',
          url: item.url,
          description: `\`${item.title}\``,
          image: { url: item.img },
          footer: {
            icon_url: item.author.avatar,
            text: `${item.author.name} • ${Player.time()}/${item.duration}`
          }
        }
      })
    }
  }
}
