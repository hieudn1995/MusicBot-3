module.exports = {
  name: ['skip', 'next', 'n'],
  desc: 'Skip current song in queue.',
  permission: [],
  usage: '',
  args: 0,
  command: async function (msg, cmd, args) {
    let Player = global.getPlayer(msg, true)
    if (!Player || !Player.size() || !Player.active) {
      msg.channel.send('Nothing is playing right now!')
      return
    }
    if (!args[0]) {
      msg.channel.send(`Current Volume: \`${Player.volume()}\``)
    } else if (isNaN(args[0]) || parseFloat(args[0]) > 1 || parseFloat(args[0]) < 0) {
      msg.channel.send('Number must be a decimal between 0-1!')
    } else {
      msg.channel.send(`Volume changed to: \`${Player.volume(parseFloat(args[0]))}\``)
    }
  }
}
