let got = require('got')
let apiGoogleTTS = process.env.API_GOOGLETTS

module.exports = {
  name: ['tts'],
  desc: 'Use Text-To-Speech in the voice channel!',
  permission: [],
  usage: '<query>',
  args: 1,
  command: async function (msg, cmd, args) {
    let Player = global.Player.get(msg)
    if (!Player) return msg.channel.send("You're not in a voice channel!")
    if (Player.channel !== msg.member.voice.channel) {
      return msg.channel.send("You're not in the voice channel!")
    }
    let sound = await textToSpeech(args.join(' '))
    let item = await Player.play(sound, msg.author)
    if (!item) msg.channel.send('Nothing found!')
    else if (item.error) msg.channel.send(item.error)
    else if (Player.active) Player.msgQueued(msg, item)
  }
}

async function textToSpeech (text, ssml, lang, name, gender, speed, pitch, volume) {
  try {
    let url = 'https://texttospeech.googleapis.com/v1beta1/text:synthesize'
    lang = lang || 'en-US'
    name = name || 'en-US-Wavenet-F'
    gender = gender || 'FEMALE'
    speed = speed || 1.0
    pitch = pitch || 0.0
    volume = volume || 0.0
    let opts = {
      method: 'POST',
      query: {
        key: apiGoogleTTS
      },
      body: {
        input: {},
        voice: {
          languageCode: lang,
          name: name,
          ssmlGender: gender
        },
        audioConfig: {
          audioEncoding: 'OGG_OPUS',
          speakingRate: speed,
          pitch: pitch,
          volumeGainDb: volume
        }
      },
      json: true
    }
    if (ssml) opts.body.input.ssml = text
    else opts.body.input.text = text

    let body = (await got(url, opts)).body.audioContent
    return {
      type: 'url',
      nolink: true,
      url: 'data:audio/opus;base64,' + body,
      title: 'TTS: ' + text
    }
  } catch (e) {
    return { error: 'Something went wrong!', e: e.response.body }
  }
}
