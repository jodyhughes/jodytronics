import { getContext } from './audioContext.js'

export class Synth {
  constructor() {
    const ctx = getContext()

    // Oscillator 1 — sawtooth (main tone)
    this._osc1 = ctx.createOscillator()
    this._osc1.type = 'sawtooth'
    this._osc1Gain = ctx.createGain()
    this._osc1Gain.gain.value = 0.35

    // Oscillator 2 — sine sub (one octave down)
    this._osc2 = ctx.createOscillator()
    this._osc2.type = 'sine'
    this._osc2Gain = ctx.createGain()
    this._osc2Gain.gain.value = 0.15

    // Noise
    this._noiseGain = ctx.createGain()
    this._noiseGain.gain.value = 0.03
    this._noiseSource = this._createNoiseSource(ctx)

    // Filter
    this._filter = ctx.createBiquadFilter()
    this._filter.type = 'lowpass'
    this._filter.frequency.value = 800
    this._filter.Q.value = 2

    // VCA (envelope-controlled gain)
    this._vca = ctx.createGain()
    this._vca.gain.value = 0

    // Output
    this.output = ctx.createGain()
    this.output.gain.value = 1

    // Wire up
    this._osc1.connect(this._osc1Gain)
    this._osc2.connect(this._osc2Gain)
    this._noiseSource.connect(this._noiseGain)
    this._osc1Gain.connect(this._filter)
    this._osc2Gain.connect(this._filter)
    this._noiseGain.connect(this._filter)
    this._filter.connect(this._vca)
    this._vca.connect(this.output)

    this._detuneCents = 7
    this._attack = 0.4
    this._release = 1.2

    this._osc1.start()
    this._osc2.start()
    this._noiseSource.start()
  }

  _createNoiseSource(ctx) {
    const bufferSize = ctx.sampleRate * 2
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1
    const source = ctx.createBufferSource()
    source.buffer = buffer
    source.loop = true
    return source
  }

  noteOn(freq, velocity = 1) {
    const ctx = getContext()
    this._osc1.frequency.setTargetAtTime(freq, ctx.currentTime, 0.01)
    this._osc1.detune.setTargetAtTime(this._detuneCents, ctx.currentTime, 0.01)
    this._osc2.frequency.setTargetAtTime(freq / 2, ctx.currentTime, 0.01)
    this._osc2.detune.setTargetAtTime(-this._detuneCents, ctx.currentTime, 0.01)
    this._vca.gain.cancelScheduledValues(ctx.currentTime)
    this._vca.gain.setValueAtTime(0, ctx.currentTime)
    this._vca.gain.setTargetAtTime(velocity, ctx.currentTime, this._attack / 3)
  }

  noteOff() {
    const ctx = getContext()
    this._vca.gain.cancelScheduledValues(ctx.currentTime)
    this._vca.gain.setValueAtTime(this._vca.gain.value, ctx.currentTime)
    this._vca.gain.setTargetAtTime(0, ctx.currentTime, this._release / 3)
  }

  set tune(semitones) {
    const ctx = getContext()
    this._osc1.detune.setTargetAtTime(semitones * 100 + this._detuneCents, ctx.currentTime, 0.02)
    this._osc2.detune.setTargetAtTime(semitones * 100 - this._detuneCents, ctx.currentTime, 0.02)
  }

  set detune(cents) {
    this._detuneCents = cents
  }

  set subMix(v) {
    this._osc2Gain.gain.setTargetAtTime(v, getContext().currentTime, 0.02)
  }

  set noise(v) {
    this._noiseGain.gain.setTargetAtTime(v, getContext().currentTime, 0.02)
  }

  set cutoff(hz) {
    this._filter.frequency.setTargetAtTime(hz, getContext().currentTime, 0.02)
  }

  set res(q) {
    this._filter.Q.setTargetAtTime(q, getContext().currentTime, 0.02)
  }

  set attack(s) {
    this._attack = s
  }

  set release(s) {
    this._release = s
  }
}
