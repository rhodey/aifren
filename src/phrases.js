import { Mic } from './mic.js'
import { Recorder } from './recorder.js'
import { EventEmitter } from 'events'
import ffmpegPath from '@ffmpeg-installer/ffmpeg'
import ffmpeg from '@bropat/fluent-ffmpeg'
import ffprobePath from '@ffprobe-installer/ffprobe'
ffmpeg.setFfmpegPath(ffmpegPath.path)
ffmpeg.setFfprobePath(ffprobePath.path)

const RMS = (buffer) => {
  let sum = 0
  const sampleCount = buffer.length / 2
  for (let i = 0; i < buffer.length; i += 2) {
    const sample = buffer.readInt16LE(i)
    sum += sample * sample
  }
  return Math.sqrt(sum / sampleCount)
}

const truncate = (wav1, wav2) => {
  return new Promise((res, rej) => {
    ffmpeg.ffprobe(wav1, (err, metadata) => {
      if (err) { return rej(err) }
      const duration = metadata.format.duration
      const newDuration = Math.max(0, duration - 1.1)
      ffmpeg(wav1)
        .setStartTime(0)
        .setDuration(newDuration)
        .audioCodec('pcm_s16le')
        .save(wav2)
        .on('end', res)
        .on('error', rej)
        .run()
    })
  })
}

export class Phrases extends EventEmitter {
  constructor(rate=48000, tmpdir='/tmp') {
    super()
    this.rate = rate
    this.tmpdir = tmpdir
    this.speaking = false
    this._mute = false
    this.noise = []
    this.early = []
    this.quiet = 0
  }

  start() {
    this.mic = new Mic(this.rate)
    this.stream = this.mic.stream
    this.stream.on('data', (data) => this._data(data))
    this.stream.on('error', (err) => this.emit('error', err))
    this.mic.start()
  }

  mute(val=1) {
    this._mute = val
  }

  stop() {
    this.mic.stop()
    if (!this.recorder) { return }
    this.recorder.stop()
    this.recorder = null
  }

  _start() {
    console.log('!! start')
    const rate = this.rate
    this.file = `${this.tmpdir}/phrase` + Date.now() + '.wav'
    const config = (child) => {
      return child
        .addInputOptions(['-f', 's16le', '-ar', rate, '-ac', 1])
        .outputOptions(['-c:a', 'pcm_s16le', '-ar', rate, '-ac', 1, '-f', 'wav', '-af', 'atrim=start=0.05,asetpts=PTS-STARTPTS,afade=t=in:st=0:d=0.06'])
        .output(this.file)
    }
    this.recorder = new Recorder(config)
    this.recorder.stream.on('error', (err) => this.emit('error', err))
    this.recorder.start()
  }

  _next() {
    console.log('!! next')
    this.recorder.stop()
    this.recorder = null
    setTimeout(() => {
      const out = this.file.replace('.wav', '.short.wav')
      truncate(this.file, out)
        .then(() => this.emit('next', out))
        .catch((err) => this.emit('error', err))
    }, 200)
  }

  _data(data) {
    if (this._mute) { return }
    const rms = RMS(data)
    const samples = data.length / 2
    const sampleSeconds = samples / this.rate
    const noiseSeconds = this.noise.length * sampleSeconds
    if (noiseSeconds < 3.0) {
      this.noise.push(rms)
      return
    }

    if (!this.noiseAvg) {
      const noise = this.noise.slice(-0.33 / sampleSeconds)
      this.noiseAvg = (noise.reduce((a, b) => a + b , 0) / noise.length)
      console.log('!! ready')
    }

    this.early.push(data)
    this.early = this.early.slice(-1000)
    const loud = rms >= (this.noiseAvg * 3.5)

    if (!this.speaking && loud) {
      this.speaking = true
      this._start()
      const earlySamples = Math.floor(0.3 / sampleSeconds)
      this.early = this.early.slice(-1 * earlySamples)
      this.early.forEach((data) => this.recorder.stream.write(data))
    } else if (this.speaking && !loud) {
      this.quiet++
      const quietSeconds = this.quiet * sampleSeconds
      if (quietSeconds >= 2.0) {
        this._next()
        this.speaking = false
        this.early = []
        this.quiet = 0
      }
    }

    if (!this.recorder) { return }
    this.recorder.stream.write(data)
  }
}
