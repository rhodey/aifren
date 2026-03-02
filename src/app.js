import fs from 'fs'
import dotenv from 'dotenv'
import minimist from 'minimist'
import { mkdirp } from 'mkdirp'
import { exec } from 'child_process'
import { Phrases } from './phrases.js'
import { playAudio } from './speaker.js'
import { TinfoilAI } from 'tinfoil'

dotenv.config()
const rate = 48_000
const client = new TinfoilAI({ apiKey: process.env.tinfoil_key })

function onError(err) {
  console.log('error', err)
  process.exit(1)
}

function canSpeak() {
  return new Promise((res, rej) => {
    exec(`mimic --version`, (error, stdout, stderr) => res(error.code !== 127))
  })
}

async function speak(text) {
  const ok = await canSpeak()
  if (!ok) { return console.log(`!! install 'mimic' for TTS\n`) }
  return new Promise((res, rej) => {
    // primitive TTS (installed in docker)
    exec(`mimic -t "${text}" -voice slt`, (error, stdout, stderr) => {
      if (error) { return rej(new Error(`espeak-ng error ${error.code} ${stderr}`)) }
      res()
      console.log(``)
    })
  })
}

async function main() {
  await mkdirp('./fren')
  const args = minimist(process.argv.slice(2))
  const playback = args.playback !== false
  const audioModel = args.audio ?? 'voxtral-small-24b' // also: whisper-large-v3-turbo
  const llmModel = args.llm ?? 'llama3-3-70b' // also: kimi-k2-5
  console.log('audio', audioModel, 'llm', llmModel)

  const phrases = new Phrases(rate, './fren')
  const history = [{ role: 'system', content: 'respond with short messages.' }]

  phrases.on('next', async (wav) => {
    phrases.mute(1)
    if (playback) {
      console.log('playback')
      await playAudio(wav, rate).catch(onError)
    }

    let text = await client.audio.transcriptions.create({ model: audioModel, file: fs.createReadStream(wav) })
    text = text.text.trim()
    console.log('user', text)
    history.push({ role: 'user', content: text })

    text = await client.chat.completions.create({ model: llmModel, temperature: 1, messages: history })
    text = text.choices[0].message.content.trim()
    console.log('ai', text)
    history.push({ role: 'assistant', content: text })

    await speak(text)
    phrases.mute(0)
  })

  phrases.once('error', onError)
  phrases.start()
}

main().catch(onError)
