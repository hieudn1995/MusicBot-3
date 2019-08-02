module.exports = {
  name: ['play', 'p'],
  desc: 'Play any type of media in the voice channel!',
  permission: [],
  usage: '<query>',
  args: 1,
  command: async function (msg, cmd, args) {
    let Player = global.getPlayer(msg)
    if (!Player) return msg.channel.send("You're not in a voice channel!")
    if (Player.channel !== msg.member.voice.channel) {
      return msg.channel.send("You're not in the voice channel!")
    }
    let item = await Player.play(args.join(' ').trim(), msg.author)
    if (!item) msg.channel.send('Nothing found!')
    else if (item.error) msg.channel.send(item.error)
    else if (item.playlist || Player.active) Player.msgQueued(msg, item)
  }
}
