module.exports = {
  name: ['volume', 'vol', 'v'],
  desc: 'Change overall volume.',
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
    if (!args[0]) {
      msg.channel.send(`Current Volume: \`${Player.volume()}\``)
    } else if (isNaN(args[0]) || parseFloat(args[0]) > 1 || parseFloat(args[0]) < 0) {
      msg.channel.send('Number must be a decimal between 0-1!')
    } else {
      msg.channel.send(`Volume changed to: \`${Player.volume(parseFloat(args[0]))}\``)
    }
  }
}
