
module.exports = {
  name: ['radio', 'r'],
  desc: 'Tune into a collection of radios.',
  permission: [],
  usage: '<radio/list>',
  args: 1,
  command: async function (msg, cmd, args) {
    let query = args.join(' ')
    if (query === 'list') return printList(msg)
    let Player = global.Player.get(msg)
    if (!Player) return msg.channel.send("You're not in a voice channel!")
    if (Player.channel !== msg.member.voice.channel) {
      return msg.channel.send("You're not in the voice channel!")
    }
    let radio = await getRadio(query)
    if (!radio) {
      msg.channel.send('Invalid radio type!')
      return
    }
    let item = await Player.play(radio, msg.author)
    if (!item) msg.channel.send('Nothing found!')
    else if (item.error) msg.channel.send(item.error)
    else if (Player.active) Player.msgQueued(msg, item)
  }
}

async function getRadio (type) {
  type = type.toLowerCase()
  if (Object.prototype.hasOwnProperty.call(radios, type)) {
    let index = keys.map(x => x.toLowerCase()).indexOf(type)
    return {
      type: 'radio',
      title: keys[index] + ' Radio',
      url: radios[type]
    }
  } else return null
}

function printList (msg) {
  let radiolist = []
  for (let i = 0; i < keys.length; i++) radiolist.push(`\`${keys[i]}\``)
  msg.channel.send({
    embed: {
      title: `Radio Channels (${radiolist.length})`,
      color: 123832,
      description: radiolist.join(' | ')
    }
  })
}

let radios = {
  '1Live': 'https://dg-wdr-https-fra-dtag-cdn.sslcast.addradio.de/wdr/1live/live/mp3/128/stream.mp3',
  'WDR Cosmo': 'https://dg-wdr-https-dus-dtag-cdn.sslcast.addradio.de/wdr/cosmo/live/mp3/128/stream.mp3',
  'listen.moe': 'https://listen.moe/opus',
  'listen.moe KPOP': 'https://listen.moe/kpop/opus',
  AnimeRadio: 'http://stream.animeradio.de/animeradio.mp3',
  Chillsky: 'http://hyades.shoutca.st:8043/stream',
  'osu!station': 'http://net.web.yas-online.net:8000/osustation',
  'R/a/dio': 'https://stream.r-a-d.io/main.mp3',
  GamerSound: 'http://149.56.147.197:8716/stream',
  'Powerplay JPOP': 'http://agnes.torontocast.com:8102/;'
}
let keys = Object.keys(radios).sort()
radios = keys.reduce((acc, key) => {
  acc[key.toLowerCase()] = radios[key]
  return acc
}, {})
