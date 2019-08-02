module.exports = {
  name: ['skip', 'next', 'n'],
  desc: 'Skip current item in queue.',
  permission: [],
  usage: '',
  args: 0,
  command: async function (msg, cmd, args) {
    let Player = global.getPlayer(msg, true)
    if (!Player || !Player.size() || !Player.active) {
      msg.channel.send('Nothing is playing right now!')
      return
    }
    Player.skip()
  }
}
