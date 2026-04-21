import { getContext } from './audioContext.js'

export class Voice {
  constructor() {
    const ctx = getContext()

    this._osc1 = ctx.createOscillator()
    this._osc1.type = 'sawtooth'
    this._osc1Gain = ctx.createGain()
    this._osc1Gain.gain.value = 0.35

    this._osc2 = ctx.createOscillator()
    this._osc2.type = 'sine'
    this._osc2Gain = ctx.createGain()
    this._osc2Gain.gain.value = 0.15

    this._noiseGain = ctx.createGain()
    this._noiseGain.gain.value = 0.03
    this._noiseSource = this._createNoise(ctx)

    this._filter = ctx.createBiquadFilter()
    this._filter.type = 'lowpass'
    this._filter.frequency.value = 800
    this._filter.Q.value = 2

    this._vca = ctx.createGain()
    this._vca.gain.value = 0

    this.output = ctx.createGain()
    this.output.gain.value = 1

    this._osc1.connect(this._osc1Gain)
    this._osc2.connect(this._osc2Gain)
    this._noiseSource.connect(this._noiseGain)
    this._osc1Gain.connect(this._filter)
    this._osc2Gain.connect(this._filter)
    this._noiseGain.connect(this._filter)
    this._filter.connect(this._vca)
    this._vca.connect(this.output)

    this._osc1.start()
    this._osc2.start()
    this._noiseSource.start()

    this.midi = null
    this._isReleasing = false
  }

  _createNoise(ctx) {
    const bufferSize = ctx.sampleRate * 2
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1
    const source = ctx.createBufferSource()
    source.buffer = buffer
    source.loop = true
    return source
  }

  noteOn(freq, velocity, attack, detuneCents) {
    const ctx = getContext()
    const now = ctx.currentTime
    this._isReleasing = false

    this._osc1.frequency.setTargetAtTime(freq, now, 0.01)
    this._osc1.detune.setTargetAtTime(detuneCents, now, 0.01)
    this._osc2.frequency.setTargetAtTime(freq / 2, now, 0.01)
    this._osc2.detune.setTargetAtTime(-detuneCents, now, 0.01)

    const startGain = this._vca.gain.value
    this._vca.gain.cancelScheduledValues(now)
    this._vca.gain.setValueAtTime(startGain, now)

    const N = 256
    const curve = new Float32Array(N)
    for (let i = 0; i < N; i++) {
      const t = Math.pow(i / (N - 1), 4)
      curve[i] = startGain + (velocity - startGain) * t
    }
    this._vca.gain.setValueCurveAtTime(curve, now, attack)
  }

  noteOff(release) {
    const ctx = getContext()
    const now = ctx.currentTime
    this._vca.gain.cancelScheduledValues(now)
    this._vca.gain.setValueAtTime(this._vca.gain.value, now)
    this._vca.gain.setTargetAtTime(0, now, release / 3)
    this.midi = null
    this._isReleasing = true
  }
}
