
module.exports = {
  name: ['radio', 'r'],
  desc: 'Tune in to a collection of radios!',
  permission: [],
  usage: '<radio/list>',
  args: 1,
  command: async function (msg, cmd, args) {
    let Player = global.getPlayer(msg)
    if (!Player) {
      msg.channel.send("You're not in a voice channel!")
      return
    }
    let query = args.join(' ')
    if (query === 'list') printList(msg)
    else {
      let radio = await getRadio(query)
      if (!radio) {
        msg.channel.send('Invalid radio type!')
        return
      }
      let item = await Player.play(radio, msg.author)
      if (!item) msg.channel.send('Nothing found!')
      else if (item.error) msg.channel.send(item.error)
      else if (Player.playing) Player.msgQueued(msg, item)
    }
  }
}

async function getRadio (type) {
  type = type.toLowerCase()
  if (radios.hasOwnProperty(type)) {
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
      description: radiolist.join(' | ')
    }
  })
}

let radios = {
  '1Live': 'https://dg-wdr-https-fra-dtag-cdn.sslcast.addradio.de/wdr/1live/live/mp3/128/stream.mp3',
  'WDR Cosmo': 'https://dg-wdr-https-dus-dtag-cdn.sslcast.addradio.de/wdr/cosmo/live/mp3/128/stream.mp3',
  'listen.moe': 'https://listen.moe/opus',
  'listen.moe kpop': 'https://listen.moe/kpop/opus',
  'AnimeRadio': 'http://stream.animeradio.de/animeradio.mp3',
  'Chillsky': 'http://hyades.shoutca.st:8043/stream',
  'osu!station': 'http://net.web.yas-online.net:8000/osustation'
}
let keys = Object.keys(radios).sort()
radios = keys.reduce((acc, key) => {
  acc[key.toLowerCase()] = radios[key]
  return acc
}, {})
