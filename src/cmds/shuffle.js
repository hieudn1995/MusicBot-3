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

function shuffleArrayFair (arr) {
  console.log(arr)
  return arr
}
