module.exports = {
  name: ['shuffle'],
  desc: 'Shuffle all items in queue.',
  permission: [],
  usage: '',
  args: 0,
  command: async function (msg, cmd, args) {
    let Player = global.Player.get(msg, true)
    if (!Player || !Player.size() || !Player.active) {
      msg.channel.send('Nothing is playing right now!')
      return
    }
    if (Player.channel !== msg.member.voice.channel) {
      return msg.channel.send("You're not in the voice channel!")
    }
    let queue = Player.get()
    let first = queue.shift()
    queue = shuffleArray(queue)
    Player.set([first])
    queue.forEach(x => Player.update(x))
    msg.channel.send('Shuffled the queue!')
  }
}

function shuffleArray (arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    let j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}
