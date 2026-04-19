import { getContext } from './audioContext.js'

export class StereoWidener {
  constructor() {
    const ctx = getContext()

    this.input = ctx.createGain()
    this.output = ctx.createGain()

    const merger = ctx.createChannelMerger(2)

    // Left: direct
    const leftGain = ctx.createGain()
    leftGain.gain.value = 1

    // Right: Haas delay + LFO modulation
    // LFO sweeps the delay time slowly — each echo lands at a different
    // stereo position as the LFO moves, creating progressive widening
    this._delay = ctx.createDelay(0.12)
    this._delay.delayTime.value = 0

    this._lfo = ctx.createOscillator()
    this._lfo.type = 'sine'
    this._lfo.frequency.value = 0.12  // ~8 second cycle

    this._lfoDepth = ctx.createGain()
    this._lfoDepth.gain.value = 0

    this._lfo.connect(this._lfoDepth)
    this._lfoDepth.connect(this._delay.delayTime)

    // Slight high-shelf cut on delayed side — softens comb filtering
    this._shelf = ctx.createBiquadFilter()
    this._shelf.type = 'highshelf'
    this._shelf.frequency.value = 6000
    this._shelf.gain.value = -3

    this.input.connect(leftGain)
    leftGain.connect(merger, 0, 0)

    this.input.connect(this._delay)
    this._delay.connect(this._shelf)
    this._shelf.connect(merger, 0, 1)

    merger.connect(this.output)

    this._lfo.start()
    this._width = 0
  }

  set width(v) {
    const ctx = getContext()
    this._width = v
    // Base Haas delay: up to 60ms
    this._delay.delayTime.cancelScheduledValues(ctx.currentTime)
    this._delay.delayTime.setTargetAtTime(v * 0.06, ctx.currentTime, 0.05)
    // LFO depth: up to 30ms — sweeps each echo to a different position
    this._lfoDepth.gain.setTargetAtTime(v * 0.03, ctx.currentTime, 0.05)
  }
}
