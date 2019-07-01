module.exports = {
  name: ['pause'],
  desc: 'Pauses current song in queue.',
  permission: [],
  usage: '',
  args: 0,
  command: async function (msg, cmd, args) {
    let { Player } = global
    if (!Player || !Player.size() || !Player.playing) {
      msg.channel.send('Nothing is playing right now!')
      return
    }
    let state = Player.pause()
    msg.channel.send(state ? 'Queue paused!' : 'Queue unpaused!')
  }
}
