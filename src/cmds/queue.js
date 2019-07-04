module.exports = {
  name: ['queue', 'q'],
  desc: 'View the current queue.',
  permission: [],
  usage: '',
  args: 0,
  command: async function (msg, cmd, args) {
    let Player = global.getPlayer(msg, true)
    if (!Player || !Player.size() || !Player.playing) {
      msg.channel.send('Nothing is playing right now!')
      return
    }
    let list = []
    let max = 15
    let size = Player ? Player.size() : null
    let len = size > max ? max : size
    if (!len) return
    for (let i = 0; i < len; i++) {
      let item = Player.get(i)
      let num = (i === 0) ? 'NP:' : `${i}.`
      list.push(`${num} \`${trimSentence(item.title, 50)}\``)
    }
    if (size > max) {
      list.push(`And ${size - len} more...`)
    }
    msg.channel.send({
      embed: {
        title: `Queue (${size} Item${size > 1 ? 's' : ''})`,
        description: list.join('\r\n')
      }
    })
  }
}

function trimSentence (str, limit) {
  if (str.length > limit) {
    let arr = str.substr(0, limit).split(' ')
    arr.pop()
    str = arr.join(' ') + '...'
  }
  return str
}
