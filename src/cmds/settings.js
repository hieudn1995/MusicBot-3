module.exports = {
  name: ['settings'],
  desc: 'View and change music player settings.',
  permission: [],
  usage: '',
  args: 0,
  command: async function (msg, cmd, args) {
    let Player = global.Player.get(msg, true)
    if (!args.length) {
      let flags = Player.flags.n
      let box = `\`Color\`: ${Player.color}\n`
      for (let key in flags) {
        let prop = flags[key]
        let str = prop.toLowerCase().split('_').map(x => x[0].toUpperCase() + x.substr(1)).join('')
        box += `\`${str}\`: ${Player.flags.get(prop) ? 'yes' : 'no'}\n`
      }
      msg.channel.send({
        embed: {
          title: 'Music Player Settings',
          color: Player.color,
          description: box
        }
      })
    }
  }
}
