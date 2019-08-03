module.exports = {
  name: ['nowplaying', 'np'],
  desc: 'Show current item in queue.',
  permission: [],
  usage: '',
  args: 0,
  command: async function (msg, cmd, args) {
    let Player = global.Player.get(msg, true)
    if (!Player || !Player.size() || !Player.active) {
      return msg.channel.send('Nothing is playing right now!')
    }
    let item = await Player.first()
    if (!item) msg.channel.send('Nothing found!')
    else if (item.error) msg.channel.send(item.error)
    else Player.msgPlaying(msg, item, true)
  }
}
