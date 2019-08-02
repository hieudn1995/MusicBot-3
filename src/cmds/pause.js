module.exports = {
  name: ['pause'],
  desc: 'Pause current item in queue.',
  permission: [],
  usage: '',
  args: 0,
  command: async function (msg, cmd, args) {
    let Player = global.getPlayer(msg, true)
    if (!Player || !Player.size() || !Player.active) {
      return msg.channel.send('Nothing is playing right now!')
    }
    if (Player.channel !== msg.member.voice.channel) {
      return msg.channel.send("You're not in the voice channel!")
    }
    let state = Player.pause()
    msg.channel.send(state ? 'Queue paused!' : 'Queue unpaused!')
  }
}
