module.exports = {
  name: ['settings'],
  desc: 'View and change music player settings.',
  permission: [],
  usage: '(setting) (value)',
  args: 0,
  command: async function (msg, cmd, args) {
    let Player = global.Player.get(msg, true)
    if (!args.length) {
      let flags = Player.flags.n
      let box = `\`Color\`: ${intToHex(Player.color)}\n`
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
    } else {
      let id = args[0].toLowerCase()
      let flags = Player.flags.n
      let props = []
      for (let key in flags) {
        let prop = flags[key]
        props.push({ n: prop.toLowerCase().split('_').map(x => x[0].toUpperCase() + x.substr(1)).join(''), k: key })
      }
      if (id === 'color') {
        if (!args[1]) msg.channel.send(`Current Color: \`${intToHex(Player.color)}\``)
        else {
          let match = args[1].match(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)
          if (!match) msg.channel.send('Invalid color hex value!')
          else {
            Player.color = hexToInt(match[0])
            msg.channel.send(`Player Color set to \`${args[1]}\``)
          }
        }
      } else {
        let index = props.findIndex(x => x.n.toLowerCase() === id)
        if (index === -1) msg.channel.send('Invalid setting!')
        else {
          let prop = props[index]
          if (!args[1]) msg.channel.send(`${prop.n}: \`${Player.flags.get(flags[prop.k]) ? 'yes' : 'no'}\``)
          else {
            let arg = args[1].toLowerCase()
            let state = null
            if (arg === 'yes') state = true
            if (arg === 'no') state = false
            if (state === null) msg.channel.send('Invalid value!')
            else {
              if (!state && (Player.flags.i & prop.k) === prop.k) {
                Player.flags.i -= prop.k
              } else if (state) Player.flags.i += prop.k
              msg.channel.send(`Player Setting \`${prop.n}\` set to \`${args[1]}\``)
            }
            // TODO repair this
          }
        }
      }
    }
  }
}

function intToHex (n) {
  let rgb = [(n & 0xFF0000) >>> 16, (n & 0xFF00) >>> 8, n & 0xFF]
  let hex = rgb.map(x => x.toString(16)).map(x => x.length === 1 ? '0' + x : x).join('')
  return '#' + hex.toUpperCase()
}

function hexToInt (n) {
  let hex = n.match(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)
  if (hex && hex.length === 2) {
    if (hex[1].length === 3) hex[1] = hex[1].split('').map(x => x + x).join('')
    return parseInt(hex[1], 16)
  }
}
