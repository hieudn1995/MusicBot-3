let MusicPlayer = require('../modules/MusicPlayer')

module.exports = {
  name: ['play', 'p'],
  desc: 'Play any type of media in the voice channel!',
  permission: [],
  usage: '<query>',
  args: 1,
  command: async function (msg, cmd, args) {
    let { Player } = global
    let first = false
    if (!Player) {
      if (!msg.member.voiceChannel) {
        msg.channel.send("You're not in a voice channel!")
        return false
      }
      Player = new MusicPlayer(msg.member.voiceChannel)
      Player.on('playing', item => {
        msg.channel.send({
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
      })
      global.Player = Player
      first = true
    }
    let item = await Player.play(args.join(' '), msg.author)
    if (item.error) {
      msg.channel.send(item.error)
      return
    }
    if (!item) msg.channel.send('Nothing found!')
    if (first) return
    if (item.playlist) {
      let items = item.items
      msg.channel.send({
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
