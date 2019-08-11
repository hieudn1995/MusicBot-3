module.exports = {
  name: ['stop', 's'],
  desc: 'Stop queue and leave voice channel.',
  permission: [],
  usage: '',
  args: 0,
  command: async function (msg, cmd, args) {
    let Player = global.Player.get(msg, true)
    if (!Player) return msg.channel.send('Nothing is playing right now!')
    if (Player.channel !== msg.member.voice.channel) {
      return msg.channel.send("You're not in the voice channel!")
    }
    Player.reset()
  }
}
