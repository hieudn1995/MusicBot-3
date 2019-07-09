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
    let item = await Player.play(args.join(' ').trim(), msg.author)
    if (!item) msg.channel.send('Nothing found!')
    else if (item.error) msg.channel.send(item.error)
    else if (item.playlist || Player.playing) Player.msgQueued(msg, item)
  }
}
