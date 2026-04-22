import { getContext } from './audioContext.js'

export class Reverb {
  constructor() {
    const ctx = getContext()

    this._preDelayNode = ctx.createDelay(0.1)
    this._preDelayNode.delayTime.value = 0

    this._convolver = ctx.createConvolver()

    this._dryGain = ctx.createGain()
    this._wetGain = ctx.createGain()

    this.input  = ctx.createGain()
    this.output = ctx.createGain()

    // Dry path
    this.input.connect(this._dryGain)
    this._dryGain.connect(this.output)

    // Wet path: pre-delay → convolver → wet gain
    this.input.connect(this._preDelayNode)
    this._preDelayNode.connect(this._convolver)
    this._convolver.connect(this._wetGain)
    this._wetGain.connect(this.output)

    this._decay   = 2.5
    this._damping = 4000
    this._wet     = 0.3

    this._dryGain.gain.value = 1
    this._wetGain.gain.value = this._wet

    this._buildIR()
  }

  _buildIR() {
    const ctx = getContext()
    const sampleRate = ctx.sampleRate
    const length = Math.max(0.1, this._decay) * sampleRate
    const buffer = ctx.createBuffer(2, length, sampleRate)

    // Damping: low-frequency content decays slower than high
    const dampingCoeff = Math.exp(-2 * Math.PI * this._damping / sampleRate)

    for (let ch = 0; ch < 2; ch++) {
      const data = buffer.getChannelData(ch)
      let lp = 0
      for (let i = 0; i < length; i++) {
        const noise = Math.random() * 2 - 1
        lp = lp * dampingCoeff + noise * (1 - dampingCoeff)
        const env = Math.pow(1 - i / length, 2)
        data[i] = lp * env
      }
    }

    this._convolver.buffer = buffer
  }

  set wet(v) {
    this._wet = v
    const ctx = getContext()
    this._wetGain.gain.setTargetAtTime(v, ctx.currentTime, 0.02)
  }

  set decay(s) {
    this._decay = s
    this._buildIR()
  }

  set damping(hz) {
    this._damping = hz
    this._buildIR()
  }

  set preDelay(s) {
    const ctx = getContext()
    this._preDelayNode.delayTime.setTargetAtTime(s, ctx.currentTime, 0.01)
  }
}
