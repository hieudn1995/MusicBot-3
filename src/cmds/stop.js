module.exports = {
  name: ['stop', 's'],
  desc: 'Stops queue and leaves voice channel.',
  permission: [],
  usage: '',
  args: 0,
  command: async function (msg, cmd, args) {
    let { Player } = global
    if (!Player) {
      msg.channel.send('Nothing is playing right now!')
      return
    }
    await Player.reset()
    global.Player = null
  }
}
