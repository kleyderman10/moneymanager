import { Capacitor, registerPlugin } from '@capacitor/core'
import { WakeWordProvider, WAKE_STATES } from './WakeWordProvider'

// Native plugin (Kotlin on Android): captures the microphone and runs the openWakeWord models with
// ONNX Runtime. Only events cross to JavaScript, never audio.
export const WakeWordNative = registerPlugin('WakeWord')

const DEV = import.meta.env.DEV
const PLATFORMS = ['android']

const asError = (e) => ({ code: e?.code || 'UNKNOWN', message: e?.message || String(e) })

export class OpenWakeWordProvider extends WakeWordProvider {
  constructor(plugin = WakeWordNative, platform = Capacitor.getPlatform(), native = Capacitor.isNativePlatform()) {
    super()
    this.plugin = plugin
    this.platform = platform
    this.native = native
    this.state = WAKE_STATES.UNINITIALIZED
    this._handles = []
    this._busy = Promise.resolve()
  }

  get supported() { return this.native && PLATFORMS.includes(this.platform) }

  // Calls are queued so start/stop/pause/resume never overlap (double start, resume before release).
  _queue(task) {
    const run = this._busy.then(task, task)
    this._busy = run.catch(() => {})
    return run
  }

  async _listen() {
    if (this._handles.length) return
    this._handles = await Promise.all([
      this.plugin.addListener('wakeWordDetected', (e) => this._emit(this._detected, e)),
      this.plugin.addListener('wakeWordStateChanged', (e) => {
        this.state = e.state
        this._emit(this._state, e.state)
      }),
      this.plugin.addListener('wakeWordError', (e) => this._emit(this._error, asError(e))),
      this.plugin.addListener('wakeWordScore', (e) => this._emit(this._score, e)),
    ])
  }

  initialize({ model = 'oye_flow.onnx', phrase = 'oye_flow', threshold = 0.6, cooldownMs = 2000 } = {}) {
    return this._queue(async () => {
      if (!this.supported) throw { code: 'UNSUPPORTED_PLATFORM', message: 'Wake word is not available on this platform' }
      await this._listen()
      if (this.state !== WAKE_STATES.UNINITIALIZED && this.state !== WAKE_STATES.ERROR) return
      await this.plugin.initialize({ model, phrase, threshold, cooldownMs, debug: DEV })
    })
  }

  async isModelAvailable(model = 'oye_flow.onnx') {
    if (!this.supported) return false
    try { return Boolean((await this.plugin.modelAvailable({ model })).available) } catch { return false }
  }

  start() { return this._queue(() => this._call('start', WAKE_STATES.LISTENING)) }
  stop() { return this._queue(() => this._call('stop')) }
  pause() { return this._queue(() => this._call('pause')) }
  resume() { return this._queue(() => this._call('resume', WAKE_STATES.LISTENING)) }

  async _call(method) {
    const result = await this.plugin[method]()
    if (result?.state) this.state = result.state
    return result
  }

  destroy() {
    return this._queue(async () => {
      await this.plugin.destroy().catch(() => {})
      await Promise.all(this._handles.map((h) => h.remove?.())).catch(() => {})
      this._handles = []
      this.state = WAKE_STATES.UNINITIALIZED
    })
  }

  isListening() { return this.state === WAKE_STATES.LISTENING }

  setThreshold(threshold) {
    return this._queue(() => this.plugin.setThreshold({ threshold }))
  }
}
