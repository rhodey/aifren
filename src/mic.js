import { PassThrough } from 'stream'
import { spawn } from 'child_process'
import ffmpegPath from '@ffmpeg-installer/ffmpeg'

export class Mic {
  constructor(rate=16000) {
    this.rate = rate
    this.stream = new PassThrough()
    this.logs = ``
  }

  start() {
    const stdio = ['pipe', 'pipe', 'pipe']
    // todo: ask chatgpt args for mac and test them
    const args = ['-hide_banner', '-loglevel', 'error', '-f', 'alsa', '-i', 'hw:0,0', '-ac', 1, '-ar', this.rate, '-f', 's16le', 'pipe:1']
    const child = spawn(ffmpegPath.path, args, { stdio })
    if (!child.pid) { throw new Error('ffmpeg: no pid') }
    this.child = child
    this.child.stderr.setEncoding('utf8')
    this.child.stderr.on('data', (log) => this.logs += log)
    this.child.stdout.on('data', (data) => this._data(data))
    child.once('exit', (code) => {
      this.stream.emit('error', new Error(`ffmpeg: exit ${code} ${this.logs}`))
      this.stop()
    })
  }

  _data(data) {
    if (!this.child) { return }
    this.stream.write(data)
  }

  stop() {
    if (!this.child) { return }
    const child = this.child
    this.child = null
    try {
      this.stream.end()
    } catch (err) { }
    const kill = () => {
      this.stream.removeAllListeners()
      child.kill('SIGKILL')
    }
    this.child.removeAllListeners()
    child.kill('SIGTERM')
    setTimeout(kill, 1000)
  }
}
