module.exports = {
  name: ['loop'],
  desc: 'Loops current song in queue.',
  permission: [],
  usage: '',
  args: 0,
  command: async function (msg, cmd, args) {
    let Player = global.getPlayer(msg, true)
    if (!Player || !Player.size() || !Player.active) {
      msg.channel.send('Nothing is playing right now!')
      return
    }
    let state = Player.loop()
    msg.channel.send(state ? 'Looping current song!' : 'Not looping anymore!')
  }
}
