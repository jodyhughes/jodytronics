import { getContext } from './audioContext.js'

const MAX_DELAY = 30

export class TapeDelay {
  constructor() {
    const ctx = getContext()

    this.input = ctx.createGain()
    this.input.gain.value = 1

    this.output = ctx.createGain()
    this.output.gain.value = 1

    this._dryGain = ctx.createGain()
    this._dryGain.gain.value = 0.5

    this._wetGain = ctx.createGain()
    this._wetGain.gain.value = 0.5

    this._delay = ctx.createDelay(MAX_DELAY)
    this._delay.delayTime.value = 4.0

    this._shaper = ctx.createWaveShaper()
    this._shaper.curve = this._makeSaturationCurve(20)
    this._shaper.oversample = '4x'

    this._hfFilter = ctx.createBiquadFilter()
    this._hfFilter.type = 'lowpass'
    this._hfFilter.frequency.value = 4000
    this._hfFilter.Q.value = 0.5

    // DC blocker — high-pass at 20 Hz strips any sub-bass drift before re-entering the loop
    this._dcBlocker = ctx.createBiquadFilter()
    this._dcBlocker.type = 'highpass'
    this._dcBlocker.frequency.value = 20
    this._dcBlocker.Q.value = 0.5

    this._feedbackGain = ctx.createGain()
    this._feedbackGain.gain.value = 0.5

    this._wowLfo = ctx.createOscillator()
    this._wowLfo.type = 'sine'
    this._wowLfo.frequency.value = 0.4

    this._flutterLfo = ctx.createOscillator()
    this._flutterLfo.type = 'sine'
    this._flutterLfo.frequency.value = 4.0

    this._wowDepth = ctx.createGain()
    this._wowDepth.gain.value = 0

    this._flutterDepth = ctx.createGain()
    this._flutterDepth.gain.value = 0

    // Master gain — used to silence output instantly on stop()
    this._masterGain = ctx.createGain()
    this._masterGain.gain.value = 1

    // Dry path
    this.input.connect(this._dryGain)
    this._dryGain.connect(this._masterGain)

    // Wet + feedback loop
    this.input.connect(this._wetGain)
    this._wetGain.connect(this._delay)
    this._delay.connect(this._shaper)
    this._shaper.connect(this._dcBlocker)
    this._dcBlocker.connect(this._hfFilter)
    this._hfFilter.connect(this._feedbackGain)
    this._feedbackGain.connect(this._delay)
    this._hfFilter.connect(this._masterGain)

    this._masterGain.connect(this.output)

    // Wow/flutter → delay time
    this._wowLfo.connect(this._wowDepth)
    this._flutterLfo.connect(this._flutterDepth)
    this._wowDepth.connect(this._delay.delayTime)
    this._flutterDepth.connect(this._delay.delayTime)

    this._wowLfo.start()
    this._flutterLfo.start()
  }

  _makeSaturationCurve(amount) {
    const n = 256
    const curve = new Float32Array(n)
    for (let i = 0; i < n; i++) {
      const x = (i * 2) / n - 1
      // Unity gain at small signals (slope = 1 at x=0), saturates loudly.
      // Previous formula had slope (π+k)/π ≈ 7× at x=0, amplifying feedback noise.
      curve[i] = (Math.PI * x) / (Math.PI + amount * Math.abs(x))
    }
    return curve
  }

  set delayTime(s) {
    this._delay.delayTime.setTargetAtTime(s, getContext().currentTime, 0.1)
  }

  set feedback(v) {
    this._feedbackGain.gain.setTargetAtTime(Math.min(v, 0.95), getContext().currentTime, 0.05)
  }

  set wowFlutter(depth) {
    this._wowDepth.gain.setTargetAtTime(depth * 0.015, getContext().currentTime, 0.1)
    this._flutterDepth.gain.setTargetAtTime(depth * 0.003, getContext().currentTime, 0.1)
  }

  set saturation(amount) {
    this._shaper.curve = this._makeSaturationCurve(Math.max(1, amount))
  }

  set hfDamping(hz) {
    this._hfFilter.frequency.setTargetAtTime(hz, getContext().currentTime, 0.05)
  }

  set wet(v) {
    this._wetGain.gain.setTargetAtTime(v, getContext().currentTime, 0.05)
    this._dryGain.gain.setTargetAtTime(1 - v, getContext().currentTime, 0.05)
  }

  stop() {
    const ctx = getContext()

    // Silence output immediately
    this._masterGain.gain.setValueAtTime(0, ctx.currentTime)

    // Swap in a fresh DelayNode — the only way to clear the buffer
    const currentDelayTime = this._delay.delayTime.value

    this._wetGain.disconnect(this._delay)
    this._feedbackGain.disconnect(this._delay)
    this._wowDepth.disconnect(this._delay.delayTime)
    this._flutterDepth.disconnect(this._delay.delayTime)
    this._delay.disconnect()

    const newDelay = ctx.createDelay(MAX_DELAY)
    newDelay.delayTime.value = currentDelayTime

    this._wetGain.connect(newDelay)
    newDelay.connect(this._shaper)
    this._feedbackGain.connect(newDelay)
    this._wowDepth.connect(newDelay.delayTime)
    this._flutterDepth.connect(newDelay.delayTime)

    this._delay = newDelay

    // Restore output
    this._masterGain.gain.setValueAtTime(1, ctx.currentTime + 0.04)
  }
}
