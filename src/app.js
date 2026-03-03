import fs from 'fs'
import dotenv from 'dotenv'
import minimist from 'minimist'
import { mkdirp } from 'mkdirp'
import { Phrases } from './phrases.js'
import { playAudio, speak } from './speaker.js'
import { TinfoilAI } from 'tinfoil'

dotenv.config()
const client = new TinfoilAI({ apiKey: process.env.tinfoil_key })

function onError(err) {
  console.log('error', err)
  process.exit(1)
}

async function main() {
  await mkdirp('./fren')
  const args = minimist(process.argv.slice(2))
  const audioModel = args.audio ?? 'voxtral-small-24b' // also: whisper-large-v3-turbo
  const llmModel = args.llm ?? 'llama3-3-70b' // also: kimi-k2-5
  console.log('!! audio', audioModel, 'llm', llmModel)
  console.log('!! ready')

  const rate_in = 16000
  const rate_out = args['rate-out'] ?? 48000
  const playback = args.playback !== false
  const voice = args.voice ?? 'en+f3'

  const phrases = new Phrases(rate_in, rate_out, './fren')
  const history = [{ role: 'system', content: 'respond with short messages.' }]

  phrases.on('speech', () => {
    console.log('!! speech')
  })

  phrases.on('next', async (mp3) => {
    console.log('!! next')
    phrases.mute(1)

    if (playback) {
      await playAudio(mp3, rate_out).catch(onError)
    }

    console.log('!! transcribe')
    let text = await client.audio.transcriptions.create({
      model: audioModel, prompt: 'transcribe the audio',
      file: fs.createReadStream(mp3)
    })
    text = text.text.trim()
    console.log('user', text)
    history.push({ role: 'user', content: text })

    console.log('!! llm')
    text = await client.chat.completions.create({ model: llmModel, temperature: 1, messages: history })
    text = text.choices[0].message.content.trim()
    console.log('llm', text)
    history.push({ role: 'assistant', content: text })

    console.log('!! speak')
    await speak(text, rate_out, voice)
    phrases.mute(0)
  })

  phrases.once('error', onError)
  phrases.start()
}

main().catch(onError)
