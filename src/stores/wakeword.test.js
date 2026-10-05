import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { WakeWordProvider, WAKE_STATES } from '@/services/wakeword/WakeWordProvider'
import { OpenWakeWordProvider } from '@/services/wakeword/OpenWakeWordProvider'
import { setWakeWordProvider } from '@/services/wakeword/WakeWordService'
import { useWakeWordStore } from '@/stores/wakeword'

// In-memory engine that follows the same state rules as the native one.
class FakeProvider extends WakeWordProvider {
  constructor() {
    super()
    this.state = WAKE_STATES.UNINITIALIZED
    this.calls = []
    this.failStart = null
  }
  get supported() { return true }
  _set(state) { this.state = state; this._emit(this._state, state) }
  async initialize(options) { this.calls.push(['initialize', options]); this._set(WAKE_STATES.READY) }
  async start() {
    this.calls.push(['start'])
    if (this.failStart) { this._set(WAKE_STATES.ERROR); throw this.failStart }
    this._set(WAKE_STATES.LISTENING)
  }
  async pause() { this.calls.push(['pause']); this._set(WAKE_STATES.PAUSED) }
  async resume() { this.calls.push(['resume']); this._set(WAKE_STATES.LISTENING) }
  async stop() { this.calls.push(['stop']); this._set(WAKE_STATES.READY) }
  async destroy() { this.calls.push(['destroy']); this._set(WAKE_STATES.UNINITIALIZED) }
  async setThreshold(value) { this.calls.push(['setThreshold', value]) }
  detect() { this._set(WAKE_STATES.DETECTED); this._emit(this._detected, { phrase: 'oye_flow', score: 0.9, timestamp: 1 }) }
  names() { return this.calls.map((c) => c[0]) }
}

let provider
let store

beforeEach(() => {
  const data = new Map()
  vi.stubGlobal('localStorage', {
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => data.set(key, String(value)),
  })
  setActivePinia(createPinia())
  provider = new FakeProvider()
  setWakeWordProvider(provider)
  store = useWakeWordStore()
  store.setEnabled(true)
})

describe('wake word store', () => {
  it('initializes then starts listening', async () => {
    await store.sync(true)
    expect(provider.names()).toEqual(['initialize', 'start'])
    expect(store.state).toBe('LISTENING')
  })

  it('does nothing while disabled', async () => {
    store.setEnabled(false)
    await store.sync(true)
    expect(provider.names()).not.toContain('start')
  })

  it('pauses when the assistant opens and resumes when it closes', async () => {
    await store.sync(true)
    await store.sync(false)
    expect(store.state).toBe('PAUSED')
    await store.sync(true)
    expect(provider.names()).toEqual(['initialize', 'start', 'pause', 'resume'])
    expect(store.state).toBe('LISTENING')
  })

  it('releases the microphone in the background', async () => {
    await store.sync(true)
    await store.sync(true, false)
    expect(store.state).toBe('READY')
    await store.sync(true, true)
    expect(provider.names().filter((n) => n === 'resume')).toHaveLength(1)
  })

  it('emits the detection to the handler and counts it', async () => {
    const handler = vi.fn()
    store.setHandler(handler)
    await store.sync(true)
    provider.detect()
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ phrase: 'oye_flow' }))
    expect(store.detections).toBe(1)
    expect(store.lastDetection.score).toBe(0.9)
  })

  it('maps a denied microphone to a friendly error and disables itself', async () => {
    provider.failStart = { code: 'MICROPHONE_PERMISSION_DENIED', message: 'denied' }
    await store.sync(true)
    expect(store.error).toBe('denied')
    expect(store.enabled).toBe(false)
  })

  it('does not retry on its own after an error', async () => {
    provider.failStart = { code: 'MICROPHONE_UNAVAILABLE', message: 'busy' }
    await store.sync(true)
    const calls = provider.names().length
    await store.sync(true)
    await store.sync(true)
    expect(provider.names()).toHaveLength(calls)
    expect(store.error).toBe('micBusy')
    // After an explicit retry it tries again with a clean engine.
    provider.failStart = null
    store.retry()
    await store.sync(true)
    expect(store.state).toBe('LISTENING')
  })

  it('maps sensitivity to a threshold', async () => {
    await store.sync(true)
    await store.setSensitivity('low')
    expect(store.threshold).toBe(0.8)
    expect(provider.calls.at(-1)).toEqual(['setThreshold', 0.8])
  })
})

describe('OpenWakeWordProvider', () => {
  const makePlugin = () => {
    const handlers = {}
    return {
      handlers,
      addListener: vi.fn(async (name, cb) => { handlers[name] = cb; return { remove: vi.fn() } }),
      initialize: vi.fn(async () => {}),
      start: vi.fn(async () => ({ state: 'LISTENING' })),
      stop: vi.fn(async () => ({ state: 'READY' })),
      pause: vi.fn(async () => ({ state: 'PAUSED' })),
      resume: vi.fn(async () => ({ state: 'LISTENING' })),
      destroy: vi.fn(async () => {}),
      setThreshold: vi.fn(async () => ({})),
    }
  }

  it('is unsupported on web and iOS', async () => {
    expect(new OpenWakeWordProvider(makePlugin(), 'web', false).supported).toBe(false)
    expect(new OpenWakeWordProvider(makePlugin(), 'ios', true).supported).toBe(false)
    await expect(new OpenWakeWordProvider(makePlugin(), 'web', false).initialize()).rejects.toMatchObject({ code: 'UNSUPPORTED_PLATFORM' })
  })

  it('forwards native events', async () => {
    const plugin = makePlugin()
    const provider = new OpenWakeWordProvider(plugin, 'android', true)
    const detected = vi.fn()
    const states = vi.fn()
    const errors = vi.fn()
    provider.onDetected(detected)
    provider.onStateChange(states)
    provider.onError(errors)
    await provider.initialize({ threshold: 0.7 })
    expect(plugin.initialize).toHaveBeenCalledWith(expect.objectContaining({ threshold: 0.7, model: 'oye_flow.onnx' }))
    plugin.handlers.wakeWordDetected({ phrase: 'oye_flow', score: 0.8, timestamp: 5 })
    plugin.handlers.wakeWordStateChanged({ state: 'DETECTED' })
    plugin.handlers.wakeWordError({ code: 'AUDIO_CAPTURE_ERROR', message: 'x' })
    expect(detected).toHaveBeenCalledWith({ phrase: 'oye_flow', score: 0.8, timestamp: 5 })
    expect(states).toHaveBeenCalledWith('DETECTED')
    expect(errors).toHaveBeenCalledWith({ code: 'AUDIO_CAPTURE_ERROR', message: 'x' })
  })

  it('serializes calls so pause finishes before resume starts', async () => {
    const plugin = makePlugin()
    const order = []
    plugin.pause = vi.fn(async () => { await new Promise((r) => setTimeout(r, 20)); order.push('pause'); return { state: 'PAUSED' } })
    plugin.resume = vi.fn(async () => { order.push('resume'); return { state: 'LISTENING' } })
    const provider = new OpenWakeWordProvider(plugin, 'android', true)
    await provider.initialize()
    await Promise.all([provider.pause(), provider.resume()])
    expect(order).toEqual(['pause', 'resume'])
  })
})
