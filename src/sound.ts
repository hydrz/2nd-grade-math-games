export type SoundName =
  | 'tap'
  | 'pick'
  | 'drop'
  | 'snap'
  | 'rotate'
  | 'draw'
  | 'pen'
  | 'erase'
  | 'hint'
  | 'match'
  | 'success'
  | 'retry'
  | 'star'
  | 'fanfare'

interface Voice {
  freq: number
  at?: number
  length?: number
  type?: OscillatorType
  volume?: number
  slide?: number
}

let enabled = true
let context: AudioContext | null = null
let output: GainNode | null = null
let noise: AudioBuffer | null = null
const VOLUME = 0.75

export function setSoundEnabled(value: boolean) {
  enabled = value
  if (context && output) output.gain.setTargetAtTime(value ? VOLUME : 0, context.currentTime, 0.01)
}

// Created lazily on first playback; game interactions double as the gesture that
// unlocks audio, so no extra "enable sound" prompt is needed.
function engine(): { ctx: AudioContext; out: GainNode } | null {
  if (typeof window === 'undefined') return null
  const Ctor =
    window.AudioContext ??
    (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctor) return null
  if (!context || !output) {
    try {
      context = new Ctor()
      output = context.createGain()
      output.gain.value = VOLUME
      output.connect(context.destination)
    } catch {
      return null
    }
  }
  if (context.state === 'suspended') context.resume().catch(() => {})
  return { ctx: context, out: output }
}

function tone(ctx: AudioContext, out: GainNode, start: number, voice: Voice) {
  const from = start + (voice.at ?? 0),
    length = voice.length ?? 0.12
  const osc = ctx.createOscillator(),
    gain = ctx.createGain()
  osc.type = voice.type ?? 'sine'
  osc.frequency.setValueAtTime(voice.freq, from)
  if (voice.slide) osc.frequency.exponentialRampToValueAtTime(voice.slide, from + length)
  gain.gain.setValueAtTime(0.0001, from)
  gain.gain.linearRampToValueAtTime(voice.volume ?? 0.12, from + 0.012)
  gain.gain.exponentialRampToValueAtTime(0.0001, from + length)
  osc.connect(gain)
  gain.connect(out)
  osc.start(from)
  osc.stop(from + length + 0.03)
}

function noiseBuffer(ctx: AudioContext) {
  if (!noise) {
    noise = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.08), ctx.sampleRate)
    const data = noise.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  }
  return noise
}

// A short filtered noise burst reads as wood/paper rather than a musical note.
function click(ctx: AudioContext, out: GainNode, start: number, volume = 0.16, frequency = 1600) {
  const source = ctx.createBufferSource(),
    filter = ctx.createBiquadFilter(),
    gain = ctx.createGain()
  source.buffer = noiseBuffer(ctx)
  filter.type = 'bandpass'
  filter.frequency.value = frequency
  filter.Q.value = 0.8
  gain.gain.setValueAtTime(volume, start)
  gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.055)
  source.connect(filter)
  filter.connect(gain)
  gain.connect(out)
  source.start(start)
  source.stop(start + 0.06)
}

export function playSound(name: SoundName) {
  if (!enabled) return
  const active = engine()
  if (!active) return
  const { ctx, out } = active,
    t = ctx.currentTime + 0.01
  switch (name) {
    case 'tap':
      tone(ctx, out, t, { freq: 660, length: 0.07, volume: 0.1, slide: 590 })
      break
    case 'pick':
      click(ctx, out, t, 0.1, 2200)
      tone(ctx, out, t, { freq: 330, length: 0.06, volume: 0.08, type: 'triangle' })
      break
    case 'drop':
      click(ctx, out, t, 0.14, 1400)
      tone(ctx, out, t, { freq: 300, length: 0.09, volume: 0.1, type: 'triangle', slide: 220 })
      break
    case 'snap':
      click(ctx, out, t, 0.16, 2600)
      tone(ctx, out, t, { freq: 880, length: 0.06, volume: 0.09 })
      tone(ctx, out, t, { freq: 1320, at: 0.04, length: 0.09, volume: 0.07 })
      break
    case 'rotate':
      // Ratchet tick: two wood clicks rising in pitch read as a mechanical turn.
      click(ctx, out, t, 0.1, 1700)
      click(ctx, out, t + 0.055, 0.09, 2300)
      break
    case 'draw':
      // Pencil on paper: a louder low scratch layered with a bright tail.
      click(ctx, out, t, 0.16, 1900)
      click(ctx, out, t + 0.012, 0.09, 3200)
      break
    case 'pen':
      click(ctx, out, t, 0.1, 2600)
      break
    case 'erase':
      click(ctx, out, t, 0.12, 750)
      tone(ctx, out, t, { freq: 300, length: 0.1, volume: 0.07, slide: 190 })
      break
    case 'hint':
      tone(ctx, out, t, { freq: 880, length: 0.32, volume: 0.09 })
      tone(ctx, out, t, { freq: 1320, at: 0.02, length: 0.26, volume: 0.05 })
      break
    case 'match':
      click(ctx, out, t, 0.2, 1200)
      tone(ctx, out, t, { freq: 240, length: 0.05, volume: 0.09, type: 'triangle', slide: 180 })
      break
    case 'success':
      ;[523.25, 659.25, 783.99, 1046.5].forEach((freq, i) =>
        tone(ctx, out, t, { freq, at: i * 0.1, length: 0.3, volume: 0.11, type: 'triangle' }),
      )
      tone(ctx, out, t, { freq: 1568, at: 0.4, length: 0.3, volume: 0.05 })
      break
    case 'retry':
      tone(ctx, out, t, { freq: 392, length: 0.16, volume: 0.08, type: 'triangle' })
      tone(ctx, out, t, { freq: 329.63, at: 0.13, length: 0.22, volume: 0.08, type: 'triangle' })
      break
    case 'star':
      ;[1046.5, 1318.5, 1568].forEach((freq, i) =>
        tone(ctx, out, t, { freq, at: i * 0.055, length: 0.18, volume: 0.07 }),
      )
      break
    case 'fanfare':
      ;[523.25, 659.25, 783.99, 1046.5].forEach((freq, i) =>
        tone(ctx, out, t, { freq, at: i * 0.11, length: 0.3, volume: 0.11, type: 'triangle' }),
      )
      ;[1046.5, 1318.5, 1568].forEach((freq, i) =>
        tone(ctx, out, t, { freq, at: 0.46 + i * 0.03, length: 0.55, volume: 0.08 }),
      )
      break
  }
}
