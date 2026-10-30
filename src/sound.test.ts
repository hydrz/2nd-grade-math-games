import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

class FakeParam {
  value = 0
  setValueAtTime() {}
  linearRampToValueAtTime() {}
  exponentialRampToValueAtTime() {}
  setTargetAtTime() {}
}
class FakeGain {
  gain = new FakeParam()
  connect() {
    return this
  }
}
class FakeOscillator {
  type = 'sine'
  frequency = new FakeParam()
  connect() {
    return this
  }
  start() {}
  stop() {}
}
class FakeBufferSource {
  buffer: unknown = null
  connect() {
    return this
  }
  start = vi.fn()
  stop = vi.fn()
}
class FakeBiquad {
  type = 'bandpass'
  frequency = new FakeParam()
  Q = new FakeParam()
  connect() {
    return this
  }
}
class FakeContext {
  state: AudioContextState = 'running'
  currentTime = 0
  sampleRate = 44100
  destination = { connect() {} }
  oscillators: FakeOscillator[] = []
  sources: FakeBufferSource[] = []
  createGain() {
    return new FakeGain()
  }
  createOscillator() {
    const oscillator = new FakeOscillator()
    this.oscillators.push(oscillator)
    return oscillator
  }
  createBuffer(channels: number, length: number) {
    return { getChannelData: () => new Float32Array(channels * length) }
  }
  createBufferSource() {
    const source = new FakeBufferSource()
    this.sources.push(source)
    return source
  }
  createBiquadFilter() {
    return new FakeBiquad()
  }
  resume() {
    return Promise.resolve()
  }
}
const created: FakeContext[] = []
class TestContext extends FakeContext {
  constructor() {
    super()
    created.push(this)
  }
}
beforeEach(() => {
  created.length = 0
  vi.resetModules()
  vi.stubGlobal('window', { AudioContext: TestContext })
})
afterEach(() => vi.unstubAllGlobals())
describe('synthesized game sounds', () => {
  it('creates one shared AudioContext and plays notes on demand', async () => {
    const { playSound } = await import('./sound')
    playSound('success')
    playSound('tap')
    expect(created).toHaveLength(1)
    expect(created[0].oscillators.length).toBeGreaterThanOrEqual(5)
  })
  it('plays pencil strokes and match clicks through noise buffers', async () => {
    const { playSound } = await import('./sound')
    playSound('draw')
    playSound('match')
    expect(created).toHaveLength(1)
    expect(created[0].sources).toHaveLength(3)
    expect(created[0].sources.every((source) => source.start.mock.calls.length)).toBe(true)
  })
  it('does not touch Web Audio while muted', async () => {
    const { playSound, setSoundEnabled } = await import('./sound')
    setSoundEnabled(false)
    playSound('match')
    expect(created).toHaveLength(0)
  })
})
