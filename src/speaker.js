import fs from 'fs'
import text2wav from 'text2wav'
import { spawn } from 'child_process'
import ffmpegPath from '@ffmpeg-installer/ffmpeg'
import ffmpeg from '@bropat/fluent-ffmpeg'
ffmpeg.setFfmpegPath(ffmpegPath.path)

export function playAudio(wav, rate_out=48000) {
  const stdio = ['pipe', 'pipe', 'pipe']
  // todo: ask chatgpt args for mac and test them
  const args = ['-hide_banner', '-loglevel', 'error', '-i', 'pipe:0', '-ar', rate_out, '-ac', 2, '-f', 'alsa', 'hw:0,0']
  const child = spawn(ffmpegPath.path, args, { stdio })
  return new Promise((res, rej) => {
    if (!child.pid) { return rej(new Error('ffmpeg: no pid')) }
    let logs = ``
    child.stderr.setEncoding('utf8')
    child.stderr.on('data', (log) => logs += log)
    wav = fs.createReadStream(wav)
    wav.on('error', rej)
    setTimeout(() => wav.pipe(child.stdin), 200)
    child.once('exit', (code) => {
      if (code !== 0) { rej(`ffmpeg: exit ${code} ${logs}`) }
      res()
    })
  })
}

const resample = (wav1, wav2, rate_out) => {
  return new Promise((res, rej) => {
    ffmpeg(wav1)
      .audioCodec('pcm_s16le')
      .audioFrequency(rate_out)
      .save(wav2)
      .on('end', res)
      .on('error', rej)
      .run()
  })
}

export async function speak(text, rate_out=48000, voice='en+f3') {
  const bytes = await text2wav(text, { voice })
  const wav1 = '/tmp/tts1.wav'
  fs.writeFileSync(wav1, Buffer.from(bytes))
  const wav2 = '/tmp/tts2.wav'
  await resample(wav1, wav2, rate_out)
  await playAudio(wav2, rate_out)
}
