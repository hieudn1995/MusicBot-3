module.exports = {
  name: ['shuffle'],
  desc: 'Shuffle all songs in queue',
  permission: [],
  usage: '(random/fair)',
  args: 0,
  command: async function (msg, cmd, args) {
    let Player = global.getPlayer(msg, true)
    if (!Player || !Player.size() || !Player.playing) {
      msg.channel.send('Nothing is playing right now!')
      return
    }
    let method = args[0]
    if (!method || method === 'random') {
      let queue = Player.get()
      let first = queue.shift()
      queue = shuffleArray(queue)
      queue.unshift(first)
      Player.set(queue)
      msg.channel.send('Shuffled queue!')
    } else if (method === 'fair') {
      let queue = Player.get()
      let first = queue.shift()
      queue = shuffleArrayFair(queue)
      queue.unshift(first)
      msg.channel.send('Shuffled queue with a bit of salt!')
      Player.set(queue)
    } else {
      msg.channel.send('Invalid method!')
    }
  }
}

function shuffleArray (arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    let j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

function shuffleArrayFair (queue) {
  let authors = {}
  for (let i = 0; i < queue.length; i++) {
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
  let items = []
  for (let id in authors) {
    let author = authors[id]
    author.items = shuffleArray(author.items)
    items.push(author.items)
  }
  let res = []
  let max = 123456
  let last = null
  while (items.length > 0) {
    max--
    if (max <= 0) return res
    let rnd = Math.floor(Math.random() * items.length)
    if (items.length > 1 && last === rnd) rnd >= items.length ? rnd-- : rnd++
    last = rnd
    if (!items[rnd]) continue
    if (!items[rnd].length) delete items[rnd]
    else res.push(items[rnd].shift())
  }
  return res
}
