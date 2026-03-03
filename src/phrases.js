import split from 'split'
import { spawn } from 'child_process'
import { Mic } from './mic.js'
import { Recorder } from './recorder.js'
import { EventEmitter } from 'events'
import ffmpegPath from '@ffmpeg-installer/ffmpeg'
import ffprobePath from '@ffprobe-installer/ffprobe'
import ffmpeg from '@bropat/fluent-ffmpeg'
ffmpeg.setFfmpegPath(ffmpegPath.path)
ffmpeg.setFfprobePath(ffprobePath.path)

const truncate = (wav, mp3, rate_out) => {
  return new Promise((res, rej) => {
    ffmpeg.ffprobe(wav, (err, metadata) => {
      if (err) { return rej(err) }
      const duration = metadata.format.duration
      const newDuration = Math.max(0, duration - 1.1)
      ffmpeg(wav)
        .setStartTime(0)
        .setDuration(newDuration)
        .audioCodec('libmp3lame')
        .format('mp3')
        .save(mp3)
        .on('end', res)
        .on('error', rej)
        .run()
    })
  })
}

export class Phrases extends EventEmitter {
  constructor(rate_in=16000, rate_out=48000, tmpdir='/tmp') {
    super()
    this.rate_in = rate_in
    this.rate_out = rate_out
    this.tmpdir = tmpdir
    this.speaking = false
    this._mute = false
    this.early = Buffer.alloc(0)
    this.quiet = 0
  }

  start() {
    this.mic = new Mic(this.rate_in)
    this.mic.stream.on('data', (data) => this._mic(data))
    this.mic.stream.on('error', (err) => this.emit('error', err))
    this.mic.start()
    const stdio = ['pipe', 'pipe', 'pipe']
    const vad = spawn('./target/release/earshot-pipe', [], { stdio })
    if (!vad.pid) { throw new Error('earshot-pipe: no pid') }
    vad.stdout.setEncoding('utf8')
    vad.stdout.pipe(split()).on('data', (score) => this._vad(score))
    vad.once('exit', (code) => {
      this.emit('error', new Error(`earshot-pipe: exit ${code}`))
      this.stop()
    })
    this.vad = vad
  }

  mute(val=1) {
    this._mute = val
  }

  stop() {
    this.mic.stop()
    if (!this.vad) { return }
    const vad = this.vad
    this.vad = null
    vad.removeAllListeners()
    vad.kill('SIGKILL')
    if (!this.recorder) { return }
    this.recorder.stop()
    this.recorder = null
  }

  _speech() {
    this.emit('speech')
    this.file = `${this.tmpdir}/phrase` + Date.now() + '.wav'
    const config = (child) => {
      return child
        .addInputOptions(['-f', 's16le', '-ar', this.rate_in, '-ac', 1])
        .outputOptions(['-c:a', 'pcm_s16le', '-ar', this.rate_in, '-ac', 1, '-f', 'wav', '-af', 'atrim=start=0.05,asetpts=PTS-STARTPTS,afade=t=in:st=0:d=0.06'])
        .output(this.file)
    }
    this.recorder = new Recorder(config)
    this.recorder.stream.on('error', (err) => this.emit('error', err))
    this.recorder.start()
  }

  _next() {
    this.recorder.stop()
    this.recorder = null
    setTimeout(() => {
      const mp3 = this.file.replace('.wav', '.mp3')
      truncate(this.file, mp3, this.rate_out)
        .then(() => this.emit('next', mp3))
        .catch((err) => this.emit('error', err))
    }, 200)
  }

  _mic(data) {
    if (!this.vad) { return }
    this.vad.stdin.write(data)
    if (this._mute) { return }
    const earlySamples = Math.ceil(this.rate_in * 0.3)
    this.early = Buffer.concat([this.early, data])
    this.early = this.early.slice(-1 * Math.floor(earlySamples * 2))
    if (!this.speaking) { return }
    if (!this.recorder) { return }
    this.recorder.stream.write(data)
  }

  _vad(score) {
    if (this._mute) { return }
    const loud = parseFloat(score) >= 0.75
    if (!this.speaking && loud) {
      this.speaking = true
      this._speech()
      const earlySamples = Math.ceil(this.rate_in * 0.3)
      this.early = this.early.slice(-1 * Math.floor(earlySamples * 2))
      this.recorder.stream.write(this.early)
      this.early = Buffer.alloc(0)
    } else if (this.speaking && !loud) {
      this.quiet++
      const quietSeconds = (this.quiet * 256) / this.rate_in
      if (quietSeconds >= 2.0) {
        this._next()
        this.speaking = false
        this.early = Buffer.alloc(0)
        this.quiet = 0
      }
    } else if (this.speaking) {
      this.quiet = 0
    }
  }
}
