// Contract every wake word engine implements. Vue never talks to an engine directly: it goes through
// WakeWordService, so engines (openWakeWord today, Porcupine or others later) can be swapped here.
//
// States: UNINITIALIZED | INITIALIZING | READY | LISTENING | PAUSED | DETECTED | ERROR
export const WAKE_STATES = Object.freeze({
  UNINITIALIZED: 'UNINITIALIZED',
  INITIALIZING: 'INITIALIZING',
  READY: 'READY',
  LISTENING: 'LISTENING',
  PAUSED: 'PAUSED',
  DETECTED: 'DETECTED',
  ERROR: 'ERROR',
})

// Error codes shared with the native plugins.
export const WAKE_ERRORS = Object.freeze([
  'MICROPHONE_PERMISSION_DENIED',
  'MICROPHONE_UNAVAILABLE',
  'MODEL_NOT_FOUND',
  'MODEL_LOAD_ERROR',
  'ORT_INITIALIZATION_ERROR',
  'AUDIO_CAPTURE_ERROR',
  'INFERENCE_ERROR',
  'UNSUPPORTED_PLATFORM',
  'ALREADY_RUNNING',
  'NOT_INITIALIZED',
])

export class WakeWordProvider {
  constructor() {
    this._detected = new Set()
    this._state = new Set()
    this._error = new Set()
    this._score = new Set()
  }

  /** Whether this engine can run on the current platform. */
  get supported() { return false }

  async initialize() {}
  async start() {}
  async stop() {}
  async pause() {}
  async resume() {}
  async destroy() {}
  isListening() { return false }
  async setThreshold() {}

  onDetected(callback) { return this._subscribe(this._detected, callback) }
  onStateChange(callback) { return this._subscribe(this._state, callback) }
  onError(callback) { return this._subscribe(this._error, callback) }
  /** Development only: live score and peak. */
  onScore(callback) { return this._subscribe(this._score, callback) }

  _subscribe(set, callback) {
    set.add(callback)
    return () => set.delete(callback)
  }

  _emit(set, payload) {
    for (const callback of [...set]) {
      try { callback(payload) } catch { /* a listener must not break the engine */ }
    }
  }
}
