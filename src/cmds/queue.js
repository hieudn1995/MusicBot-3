module.exports = {
  name: ['queue', 'q'],
  desc: 'View the current queue.',
  permission: [],
  usage: '(<page>/info)',
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
    }
  }
}

function showQueue (msg, Player, page) {
  let list = []
  let distance = 15
  let min = page || 0
  min = parseInt(Math.abs(min))
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
