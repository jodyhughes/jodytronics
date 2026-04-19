import { useState, useRef, useEffect, useCallback } from 'react'
import { resumeContext } from './audio/audioContext.js'
import { Synth } from './audio/Synth.js'
import { TapeDelay } from './audio/TapeDelay.js'
import { MidiController } from './audio/MidiController.js'
import { Knob } from './components/Knob.jsx'
import { Keyboard } from './components/Keyboard.jsx'
import { TapeMachines } from './components/TapeMachines.jsx'
import { Presets } from './components/Presets.jsx'

const SYNTH_DEFAULTS = {
  tune: 0,
  detune: 7,
  subMix: 0.3,
  noise: 0.05,
  cutoff: 800,
  res: 2,
  attack: 0.4,
  release: 1.2,
}

const DELAY_DEFAULTS = {
  delayTime: 4.0,
  feedback: 0.5,
  wowFlutter: 0.2,
  saturation: 20,
  hfDamping: 4000,
  wet: 0.5,
}

export default function App() {
  const synthRef = useRef(null)
  const delayRef = useRef(null)
  const masterGainRef = useRef(null)
  const audioReadyRef = useRef(false)
  const midiRef = useRef(null)
  const meterBarRef = useRef(null)

  const [synthParams, setSynthParams] = useState(SYNTH_DEFAULTS)
  const [delayParams, setDelayParams] = useState(DELAY_DEFAULTS)
  const [volume, setVolume] = useState(0.8)

  const initAudio = useCallback(async () => {
    if (audioReadyRef.current) return
    audioReadyRef.current = true

    await resumeContext()

    const synth = new Synth()
    const delay = new TapeDelay()
    const ctx = synth.output.context

    const masterGain = ctx.createGain()
    masterGain.gain.value = 0.3 * Math.pow(volume, 2.5)

    // Hard limiter — prevents feedback runaway from blowing speakers
    const limiter = ctx.createDynamicsCompressor()
    limiter.threshold.value = -12  // start limiting at -12 dBFS
    limiter.knee.value = 0          // hard knee
    limiter.ratio.value = 20        // brick-wall behaviour
    limiter.attack.value = 0.001    // 1ms — catch transients immediately
    limiter.release.value = 0.1

    synth.output.connect(delay.input)
    delay.output.connect(masterGain)
    masterGain.connect(limiter)
    limiter.connect(ctx.destination)

    synthRef.current = synth
    delayRef.current = delay
    masterGainRef.current = masterGain
    setIsRunning(true)

    // Apply current state to freshly-created engine
    Object.entries(SYNTH_DEFAULTS).forEach(([k, v]) => { synth[k] = v })
    Object.entries(DELAY_DEFAULTS).forEach(([k, v]) => { delay[k] = v })

    // Level meter (pre-volume — measures signal before master gain)
    const analyser = ctx.createAnalyser()
    analyser.fftSize = 256
    delay.output.connect(analyser)
    const buf = new Float32Array(analyser.fftSize)
    const tick = () => {
      analyser.getFloatTimeDomainData(buf)
      let peak = 0
      for (let i = 0; i < buf.length; i++) peak = Math.max(peak, Math.abs(buf[i]))
      if (meterBarRef.current) {
        meterBarRef.current.style.width = Math.min(100, peak * 300) + '%'
      }
      setAudioLevel(Math.min(1, peak * 3))
      requestAnimationFrame(tick)
    }
    tick()

    // MIDI
    midiRef.current = new MidiController({
      onNoteOn: (freq, midi, velocity) => {
        synth.noteOn(freq, velocity)
        setActiveMidi(midi)
      },
      onNoteOff: () => {
        synth.noteOff()
        setActiveMidi(null)
      },
      onCc: (cc, value) => {
        if (cc === 1) updateSynthParam('cutoff', 200 + value * 7800)
        if (cc === 11) updateDelayParam('wet', value)
      },
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const [activeMidi, setActiveMidi] = useState(null)
  const [isRunning, setIsRunning] = useState(false)
  const [audioLevel, setAudioLevel] = useState(0)

  const updateSynthParam = useCallback((key, value) => {
    setSynthParams(p => ({ ...p, [key]: value }))
    if (synthRef.current) synthRef.current[key] = value
  }, [])

  const updateDelayParam = useCallback((key, value) => {
    setDelayParams(p => ({ ...p, [key]: value }))
    if (delayRef.current) delayRef.current[key] = value
  }, [])

  const handleNoteOn = useCallback(async (freq, midi, velocity = 1) => {
    await initAudio()
    synthRef.current?.noteOn(freq, velocity)
    setActiveMidi(midi)
    setIsRunning(true)
  }, [initAudio])

  const handleNoteOff = useCallback(() => {
    synthRef.current?.noteOff()
    setActiveMidi(null)
  }, [])

  const handleStop = useCallback(() => {
    synthRef.current?.noteOff()
    delayRef.current?.stop()
    setActiveMidi(null)
    setIsRunning(false)
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      midiRef.current?.destroy()
    }
  }, [])

  return (
    <div className="app">
      <header>
        <h1>Jodytronics</h1>
        <div className={`status-dot ${audioReadyRef.current ? 'active' : ''}`} />
        <div className="header-spacer" />
        <div className="header-meter">
          <div className="meter-track">
            <div id="meter-bar" ref={meterBarRef} />
          </div>
          <span className="meter-label">level</span>
        </div>
        <Knob
          label="vol" min={0} max={1} value={volume} defaultValue={0.8} decimals={2}
          onChange={v => {
            setVolume(v)
            if (masterGainRef.current) {
              const gain = v === 0 ? 0 : 0.3 * Math.pow(v, 2.5)
              masterGainRef.current.gain.setTargetAtTime(gain, masterGainRef.current.context.currentTime, 0.02)
            }
          }}
        />
        <button className="stop-btn" onClick={handleStop}>stop</button>
      </header>

      <TapeMachines isRunning={isRunning} audioLevel={audioLevel} />

      <Presets
        currentSynth={synthParams}
        currentDelay={delayParams}
        onLoad={({ synth, delay }) => {
          Object.entries(synth).forEach(([k, v]) => updateSynthParam(k, v))
          Object.entries(delay).forEach(([k, v]) => updateDelayParam(k, v))
        }}
      />

      <div className="panels">

        <div className="panel" id="delay-panel">
          <div className="panel-title">Tape Delay</div>
          <div className="knobs-grid knobs-grid--3">
            <Knob label="delay time" min={0.1} max={30} value={delayParams.delayTime} defaultValue={4} decimals={1} unit="s"
              onChange={v => updateDelayParam('delayTime', v)} />
            <Knob label="feedback" min={0} max={0.95} value={delayParams.feedback} defaultValue={0.5} decimals={2}
              onChange={v => updateDelayParam('feedback', v)} />
            <Knob label="wow/flutter" min={0} max={1} value={delayParams.wowFlutter} defaultValue={0.2} decimals={2}
              onChange={v => updateDelayParam('wowFlutter', v)} />
            <Knob label="saturation" min={1} max={100} value={delayParams.saturation} defaultValue={20} decimals={0}
              onChange={v => updateDelayParam('saturation', v)} />
            <Knob label="hf damping" min={500} max={18000} value={delayParams.hfDamping} defaultValue={4000} decimals={0} unit="hz"
              onChange={v => updateDelayParam('hfDamping', v)} />
            <Knob label="wet mix" min={0} max={1} value={delayParams.wet} defaultValue={0.5} decimals={2}
              onChange={v => updateDelayParam('wet', v)} />
          </div>
        </div>

        <div className="panel" id="synth-panel">
          <div className="panel-title">Synthesizer</div>
          <div className="knobs-grid">
            <Knob label="tune" min={-24} max={24} value={synthParams.tune} defaultValue={0} decimals={0} unit="st"
              onChange={v => updateSynthParam('tune', v)} />
            <Knob label="detune" min={0} max={50} value={synthParams.detune} defaultValue={7} decimals={0} unit="c"
              onChange={v => updateSynthParam('detune', v)} />
            <Knob label="sub mix" min={0} max={1} value={synthParams.subMix} defaultValue={0.3} decimals={2}
              onChange={v => updateSynthParam('subMix', v)} />
            <Knob label="noise" min={0} max={0.4} value={synthParams.noise} defaultValue={0.05} decimals={2}
              onChange={v => updateSynthParam('noise', v)} />
            <Knob label="cutoff" min={80} max={8000} value={synthParams.cutoff} defaultValue={800} decimals={0} unit="hz"
              onChange={v => updateSynthParam('cutoff', v)} />
            <Knob label="resonance" min={0.1} max={20} value={synthParams.res} defaultValue={2} decimals={1}
              onChange={v => updateSynthParam('res', v)} />
            <Knob label="attack" min={0.01} max={4} value={synthParams.attack} defaultValue={0.4} decimals={2} unit="s"
              onChange={v => updateSynthParam('attack', v)} />
            <Knob label="release" min={0.1} max={8} value={synthParams.release} defaultValue={1.2} decimals={2} unit="s"
              onChange={v => updateSynthParam('release', v)} />
          </div>
        </div>
      </div>

      <footer>
        <Keyboard onNoteOn={handleNoteOn} onNoteOff={handleNoteOff} activeMidi={activeMidi} />
      </footer>
    </div>
  )
}
