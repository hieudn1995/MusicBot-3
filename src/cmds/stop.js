module.exports = {
  name: ['stop', 's'],
  desc: 'Stop queue and leave voice channel.',
  permission: [],
  usage: '',
  args: 0,
  command: async function (msg, cmd, args) {
    let Player = global.getPlayer(msg, true)
    if (!Player) {
      msg.channel.send('Nothing is playing right now!')
      return
    }
    await Player.reset()
    if (Object.prototype.hasOwnProperty.call(global.Player, msg.guild.id)) delete global.Player[msg.guild.id]
  }
}
