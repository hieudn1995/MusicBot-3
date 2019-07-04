module.exports = {
  name: ['play', 'p'],
  desc: 'Play any type of media in the voice channel!',
  permission: [],
  usage: '<query>',
  args: 1,
  command: async function (msg, cmd, args) {
    let Player = global.getPlayer(msg)
    if (!Player) {
      msg.channel.send("You're not in a voice channel!")
      return
    }
    let item = await Player.play(args.join(' '), msg.author)
    if (!item) msg.channel.send('Nothing found!')
    else if (item.error) msg.channel.send(item.error)
    else if (Player.playing) {
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
}
