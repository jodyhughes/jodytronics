import { getContext } from './audioContext.js'

const NUM_STAGES = 6  // allpass filter stages — more = deeper notches

export class Phaser {
  constructor() {
    const ctx = getContext()

    this.input  = ctx.createGain()
    this.output = ctx.createGain()

    this._dryGain = ctx.createGain()
    this._wetGain = ctx.createGain()
    this._dryGain.gain.value = 1
    this._wetGain.gain.value = 0.5

    // LFO
    this._lfo = ctx.createOscillator()
    this._lfo.type = 'sine'
    this._lfo.frequency.value = 0.4

    this._lfoDepth = ctx.createGain()
    this._lfoDepth.gain.value = 800

    // Allpass chain
    this._stages = Array.from({ length: NUM_STAGES }, () => {
      const ap = ctx.createBiquadFilter()
      ap.type = 'allpass'
      ap.frequency.value = 1000
      ap.Q.value = 8
      return ap
    })

    // Wire allpass chain in series
    for (let i = 0; i < NUM_STAGES - 1; i++) {
      this._stages[i].connect(this._stages[i + 1])
    }

    // LFO modulates all stage frequencies
    this._lfo.connect(this._lfoDepth)
    this._stages.forEach(ap => this._lfoDepth.connect(ap.frequency))

    // Dry path
    this.input.connect(this._dryGain)
    this._dryGain.connect(this.output)

    // Wet path: input → allpass chain → wet gain → output
    this.input.connect(this._stages[0])
    this._stages[NUM_STAGES - 1].connect(this._wetGain)
    this._wetGain.connect(this.output)

    this._lfo.start()

    this._rate   = 0.4
    this._depth  = 800
    this._center = 1000
    this._feedback = 0
    this._wet   = 0.5
  }

  set rate(hz) {
    this._rate = hz
    const ctx = getContext()
    this._lfo.frequency.setTargetAtTime(hz, ctx.currentTime, 0.02)
  }

  set depth(v) {
    this._depth = v
    const ctx = getContext()
    this._lfoDepth.gain.setTargetAtTime(v, ctx.currentTime, 0.02)
  }

  set center(hz) {
    this._center = hz
    const ctx = getContext()
    this._stages.forEach(ap => ap.frequency.setTargetAtTime(hz, ctx.currentTime, 0.02))
  }

  set wet(v) {
    this._wet = v
    const ctx = getContext()
    this._wetGain.gain.setTargetAtTime(v, ctx.currentTime, 0.02)
  }
}
