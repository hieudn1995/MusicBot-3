module.exports = {
  name: ['queue', 'q'],
  desc: 'View the current queue.',
  permission: [],
  usage: '(<page>/info/i)',
  args: 0,
  command: async function (msg, cmd, args) {
    let Player = global.getPlayer(msg, true)
    if (!Player || !Player.size() || !Player.playing) {
      msg.channel.send('Nothing is playing right now!')
      return
    }
    let arg = args[0]
    if (!arg || !isNaN(arg)) {
      showQueue(msg, Player, arg)
    } else if (arg === 'info' || arg === 'i') {
      showInfo(msg, Player, args[1])
    }
  }
}

function showQueue (msg, Player, page) {
  let list = []
  let distance = 15
  let min = page || 0
  min = Math.abs(parseInt(min))
  let size = Player.size()
  let max = size
  if (!max) return
  if (min >= max) min = max - 1
  if ((max - min) > distance) {
    max += distance - (max - min)
  }
  for (let i = min; i < max; i++) {
    let item = Player.get(i)
    let num = i === 0 ? 'NP:' : `${i}.`
    list.push(`${num} \`${trimSentence(item.title, 50)}\``)
  }
  if (min > 0) list.unshift(`> ${min}`)
  if (max !== size) list.push(`> ${size - max}`)
  msg.channel.send({
    embed: {
      title: `Queue (${size} Item${size > 1 ? 's' : ''})`,
      description: list.join('\r\n')
    }
  })
}

function trimSentence (str, limit) {
  if (str && str.length > limit) {
    let arr = str.substr(0, limit).split(' ')
    arr.pop()
    str = arr.join(' ') + '...'
  }
  return str
}

function showInfo (msg, Player, index) {
  if (index === undefined || isNaN(index)) {
    let list = []
    let queue = Player.get()
    let size = Player.size()
    let authors = {}
    for (let i = 0; i < size; i++) {
      let item = queue[i]
      if (item.author) {
        if (!authors.hasOwnProperty(item.author.id)) {
          authors[item.author.id] = { name: item.author.name, items: [] }
        }
        let author = authors[item.author.id]
        let items = author.items
        items.push(item)
      } else {
        if (!authors.hasOwnProperty('none')) authors['none'] = { name: 'None', items: [] }
        authors['none'].items.push(item)
      }
    }
    for (let id in authors) {
      let author = authors[id]
      let len = author.items.length
      list.push(`${author.name} - ${len} Item${len > 1 ? 's' : ''} (${parseInt(len / size * 100)}%)`)
    }
    msg.channel.send({
      embed: {
        title: 'Queue Info',
        description: list.join('\r\n')
      }
    })
  } else {
    let item = Player.get(index)
    if (!item) {
      index = Player.size() - 1
      item = Player.get(index)
    }
    msg.channel.send({
      embed: {
        title: `Queue Info (Position: ${Math.abs(parseInt(index))})`,
        url: item.link || item.url,
        description: `\`${item.title}\``,
        thumbnail: { url: item.img },
        footer: {
          icon_url: item.author.avatar,
          text: `${item.author.name} • ${item.duration}`
        }
      }
    })
  }
}
