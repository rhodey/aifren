import fs from 'fs'
import { spawn } from 'child_process'
import ffmpegPath from '@ffmpeg-installer/ffmpeg'

export function playAudio(wav, rate=48000) {
  const stdio = ['pipe', 'pipe', 'pipe']
  // todo: learn args for mac
  const args = ['-hide_banner', '-loglevel', 'error', '-i', 'pipe:0', '-ar', rate, '-ac', 2, '-f', 'alsa', 'hw:0,0']
  const child = spawn(ffmpegPath.path, args, { stdio })
  return new Promise((res, rej) => {
    if (!child.pid) { return rej(new Error('ffmpeg: no pid')) }
    let logs = ``
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
