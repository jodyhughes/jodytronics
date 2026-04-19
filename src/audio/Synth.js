import { getContext } from './audioContext.js'
import { Voice } from './Voice.js'

const NUM_VOICES = 8

export class Synth {
  constructor() {
    const ctx = getContext()

    this.output = ctx.createGain()
    this.output.gain.value = 0.25  // headroom for multiple simultaneous voices

    this._voices = Array.from({ length: NUM_VOICES }, () => {
      const v = new Voice()
      v.output.connect(this.output)
      return v
    })

    this._noteToVoice = new Map()  // midi → voice
    this._voiceOrder = []          // midi notes oldest→newest for stealing

    this._detuneCents = 7
    this._attack  = 0.4
    this._release = 1.2
    this._cutoff  = 800
    this._res     = 2
    this._subMix  = 0.15
    this._noise   = 0.03
  }

  _allocateVoice(midi) {
    // Prefer a voice not currently playing
    const free = this._voices.find(v => v.midi === null)
    if (free) return free

    // Steal the oldest active note
    const oldest = this._voiceOrder[0]
    const stolen = this._noteToVoice.get(oldest)
    this._noteToVoice.delete(oldest)
    this._voiceOrder.shift()
    return stolen
  }

  noteOn(freq, velocity = 1, midi = -1) {
    // Re-trigger if this midi note is already playing
    if (midi !== -1 && this._noteToVoice.has(midi)) {
      this.noteOff(midi)
    }

    const voice = this._allocateVoice(midi)

    // Sync current params to the voice before triggering
    const ctx = getContext()
    voice._filter.frequency.setTargetAtTime(this._cutoff, ctx.currentTime, 0.01)
    voice._filter.Q.setTargetAtTime(this._res, ctx.currentTime, 0.01)
    voice._osc2Gain.gain.setTargetAtTime(this._subMix, ctx.currentTime, 0.01)
    voice._noiseGain.gain.setTargetAtTime(this._noise, ctx.currentTime, 0.01)

    voice.noteOn(freq, velocity, this._attack, this._detuneCents)
    voice.midi = midi

    if (midi !== -1) {
      this._noteToVoice.set(midi, voice)
      this._voiceOrder.push(midi)
    }
  }

  noteOff(midi = -1) {
    if (midi === -1) {
      for (const voice of this._noteToVoice.values()) voice.noteOff(this._release)
      this._noteToVoice.clear()
      this._voiceOrder = []
      return
    }
    const voice = this._noteToVoice.get(midi)
    if (!voice) return
    voice.noteOff(this._release)
    this._noteToVoice.delete(midi)
    this._voiceOrder = this._voiceOrder.filter(m => m !== midi)
  }

  set tune(semitones) {
    const ctx = getContext()
    for (const v of this._voices) {
      v._osc1.detune.setTargetAtTime(semitones * 100 + this._detuneCents, ctx.currentTime, 0.02)
      v._osc2.detune.setTargetAtTime(semitones * 100 - this._detuneCents, ctx.currentTime, 0.02)
    }
  }

  set detune(cents) {
    this._detuneCents = cents
  }

  set subMix(v) {
    this._subMix = v
    const ctx = getContext()
    for (const voice of this._voices) voice._osc2Gain.gain.setTargetAtTime(v, ctx.currentTime, 0.02)
  }

  set noise(v) {
    this._noise = v
    const ctx = getContext()
    for (const voice of this._voices) voice._noiseGain.gain.setTargetAtTime(v, ctx.currentTime, 0.02)
  }

  set cutoff(hz) {
    this._cutoff = hz
    const ctx = getContext()
    for (const v of this._voices) v._filter.frequency.setTargetAtTime(hz, ctx.currentTime, 0.02)
  }

  set res(q) {
    this._res = q
    const ctx = getContext()
    for (const v of this._voices) v._filter.Q.setTargetAtTime(q, ctx.currentTime, 0.02)
  }

  set attack(s)  { this._attack  = s }
  set release(s) { this._release = s }
}
