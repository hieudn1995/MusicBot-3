require('http').createServer((req, res) => {
  res.write(t(process.uptime()))
  res.end()
}).listen(3000)

function t (s) {
  let d = Math.floor(s / (3600 * 24))
  let a = new Date(s * 1000).toISOString().substr(11, 8)
  return `${d} Days ${a}`
}

module.exports = require('./core')