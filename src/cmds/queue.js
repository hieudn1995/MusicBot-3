module.exports = {
  name: ['queue', 'q'],
  desc: 'View and manipulate the queue.',
  permission: [],
  usage: '(<page>/[info/i]/[remove/rem/r]/[clear]) (<index>)',
  args: 0,
  command: async function (msg, cmd, args) {
    let Player = global.getPlayer(msg, true)
    if (!Player || !Player.size() || !Player.active) {
      return msg.channel.send('Nothing is playing right now!')
    }
    let arg = args[0]
    if (!arg || !isNaN(arg)) return showQueue(msg, Player, arg)
    if (arg === 'info' || arg === 'i') return showInfo(msg, Player, args[1])
    if (Player.channel !== msg.member.voice.channel) {
      return msg.channel.send("You're not in the voice channel!")
    }
    if (arg === 'remove' || arg === 'rem' || arg === 'r') return removeItem(msg, Player, args[1])
    if (arg === 'clear') return clearItems(msg, Player)
  }
}

function clearItems (msg, Player) {
  let queue = Player.get()
  let first = queue.shift()
  Player.set([first])
  msg.channel.send('Cleared items in queue.')
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

  let times = Player.get().map(x => x.duration)
  let duration = times.includes('∞') ? '∞' : times.map(x => hmsToMs(x)).reduce((a, b) => a + b, 0)
  msg.channel.send({
    embed: {
      title: `Queue (${size} Item${size > 1 ? 's' : ''}) [${formatTime(duration)}]`,
      color: Player.color,
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
        if (!Object.prototype.hasOwnProperty.call(authors, item.author.id)) {
          authors[item.author.id] = { name: item.author.name, items: [], duration: 0 }
        }
        let author = authors[item.author.id]
        if (author.duration !== '∞') {
          if (item.duration !== '∞') author.duration += hmsToMs(item.duration)
          else author.duration = '∞'
        }
        author.items.push(item)
      } else {
        if (!Object.prototype.hasOwnProperty.call(authors, 'none')) authors['none'] = { name: 'None', items: [] }
        authors['none'].items.push(item)
      }
    }
    for (let id in authors) {
      let author = authors[id]
      let len = author.items.length
      list.push(`${author.name} - ${len} Item${len > 1 ? 's' : ''} (${parseInt(len / size * 100)}%) [${formatTime(author.duration)}]`)
    }
    msg.channel.send({
      embed: {
        title: 'Queue Info',
        color: Player.color,
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
        color: Player.color,
        url: item.nolink ? undefined : item.link || item.url,
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

function removeItem (msg, Player, index) {
  let size = Player.size()
  if (!isNaN(index) || index === 'last' || index === 'l') {
    if (index === 'last' || index === 'l') index = size - 1
    index = parseInt(index)
    if (index >= size || index < 1) {
      msg.channel.send(`Index must be between 1 - ${size - 1}.`)
    } else {
      let item = Player.remove(index)
      if (!item) msg.channel.send('Something went wrong!')
      else msg.channel.send(`Removed \`${item.title}\` from queue.`)
    }
  } else {
    msg.channel.send('Please enter an index to remove!')
  }
}

function hmsToMs (str) {
  let p = str.split(':')
  let s = 0
  let m = 1
  while (p.length > 0) {
    s += m * parseInt(p.pop(), 10)
    m *= 60
  }
  return s * 1000
}

function formatTime (ms) {
  if (ms === '∞') return ms
  let t = new Date(ms).toISOString().substr(11, 8).split(':')
  let h = Math.floor(ms / 1000 / 60 / 60).toString()
  if (h > 23) t[0] = h
  while (t.length > 2 && t[0] === '00' && t[1].startsWith('0')) {
    t.shift()
  }
  if (t.length > 2 && t[0] === '00') t.shift()
  if (t[0].startsWith('0')) t[0] = t[0].substr(1)
  return t.join(':')
}
