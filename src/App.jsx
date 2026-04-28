import { useState, useRef, useEffect, useCallback } from 'react'
import { resumeContext, touchUnlock } from './audio/audioContext.js'
import { Synth } from './audio/Synth.js'
import { TapeDelay } from './audio/TapeDelay.js'
import { StereoWidener } from './audio/StereoWidener.js'
import { Reverb } from './audio/Reverb.js'
import { Phaser } from './audio/Phaser.js'
import { MidiController } from './audio/MidiController.js'
import { Knob } from './components/Knob.jsx'
import { Keyboard } from './components/Keyboard.jsx'
import { TapeMachines } from './components/TapeMachines.jsx'
import { Presets } from './components/Presets.jsx'

const PHASER_DEFAULTS = {
  rate:   0.4,
  depth:  800,
  center: 1000,
  wet:    0.5,
}

const REVERB_DEFAULTS = {
  decay:    2.5,
  damping:  4000,
  preDelay: 0.02,
  wet:      0.3,
}

const WIDENER_DEFAULTS = {
  width: 1.00,
}

const SYNTH_DEFAULTS = {
  tune: 0,
  detune: 7,
  subMix: 0.51,
  noise: 0.05,
  cutoff: 800,
  res: 6,
  attack: 0.6,
  release: 4.2,
}

const DELAY_DEFAULTS = {
  delayTime: 9.0,
  feedback: 0.6,
  wowFlutter: 0.1,
  saturation: 55,
  hfDamping: 4000,
  wet: 0.5,
}

export default function App() {
  const synthRef = useRef(null)
  const delayRef = useRef(null)
  const phaserRef = useRef(null)
  const reverbRef = useRef(null)
  const widenerRef = useRef(null)
  const masterGainRef = useRef(null)
  const audioReadyRef = useRef(false)
  const midiRef = useRef(null)

  const [theme, setTheme] = useState('default')

  const [synthParams, setSynthParams] = useState(SYNTH_DEFAULTS)
  const [delayParams, setDelayParams] = useState(DELAY_DEFAULTS)
  const [phaserParams, setPhaserParams] = useState(PHASER_DEFAULTS)
  const [reverbParams, setReverbParams] = useState(REVERB_DEFAULTS)
  const [widenerParams, setWidenerParams] = useState(WIDENER_DEFAULTS)
  const [volume, setVolume] = useState(0.8)
  const [phaserEnabled, setPhaserEnabled] = useState(false)
  const [reverbEnabled, setReverbEnabled] = useState(true)
  const [collapsed, setCollapsed] = useState({ phaser: true, reverb: true })
  const toggleCollapse = useCallback((id) => setCollapsed(s => ({ ...s, [id]: !s[id] })), [])

  const initAudio = useCallback(async () => {
    if (audioReadyRef.current) return
    audioReadyRef.current = true

    await resumeContext()

    const synth = new Synth()
    const delay = new TapeDelay()
    const phaser = new Phaser()
    const reverb = new Reverb()
    const widener = new StereoWidener()
    const ctx = synth.output.context

    const masterGain = ctx.createGain()
    masterGain.gain.value = 0.3 * Math.pow(volume, 2.5)

    // Hard limiter — prevents feedback runaway from blowing speakers
    const limiter = ctx.createDynamicsCompressor()
    limiter.threshold.value = -12
    limiter.knee.value = 0
    limiter.ratio.value = 20
    limiter.attack.value = 0.001
    limiter.release.value = 0.1

    synth.output.connect(delay.input)
    delay.output.connect(phaser.input)
    phaser.output.connect(reverb.input)
    reverb.output.connect(widener.input)
    widener.output.connect(masterGain)
    masterGain.connect(limiter)
    limiter.connect(ctx.destination)

    synthRef.current = synth
    delayRef.current = delay
    phaserRef.current = phaser
    reverbRef.current = reverb
    widenerRef.current = widener
    masterGainRef.current = masterGain
    setIsRunning(true)

    // Apply current state to freshly-created engine
    Object.entries(SYNTH_DEFAULTS).forEach(([k, v]) => { synth[k] = v })
    Object.entries(DELAY_DEFAULTS).forEach(([k, v]) => { delay[k] = v })
    Object.entries(PHASER_DEFAULTS).forEach(([k, v]) => { phaser[k] = v })
    Object.entries(REVERB_DEFAULTS).forEach(([k, v]) => { reverb[k] = v })
    Object.entries(WIDENER_DEFAULTS).forEach(([k, v]) => { widener[k] = v })

    // Dry analyser — synth output only (left machine meter)
    const dryAnalyser = ctx.createAnalyser()
    dryAnalyser.fftSize = 256
    synth.output.connect(dryAnalyser)

    // Wet analyser — delayed signal only (right machine meter)
    const wetAnalyser = ctx.createAnalyser()
    wetAnalyser.fftSize = 256
    delay.wetTap.connect(wetAnalyser)

    const dryBuf = new Float32Array(dryAnalyser.fftSize)
    const wetBuf = new Float32Array(wetAnalyser.fftSize)

    const tick = () => {
      dryAnalyser.getFloatTimeDomainData(dryBuf)
      wetAnalyser.getFloatTimeDomainData(wetBuf)
      let dryPeak = 0, wetPeak = 0
      for (let i = 0; i < dryBuf.length; i++) dryPeak = Math.max(dryPeak, Math.abs(dryBuf[i]))
      for (let i = 0; i < wetBuf.length; i++) wetPeak = Math.max(wetPeak, Math.abs(wetBuf[i]))
      setAudioLevelDry(Math.min(1, dryPeak * 3))
      setAudioLevelWet(Math.min(1, wetPeak * 3))
      requestAnimationFrame(tick)
    }
    tick()

  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const [activeMidis, setActiveMidis] = useState(new Set())
  const [isRunning, setIsRunning] = useState(false)
  const [midiEnabled, setMidiEnabled] = useState(false)
  const [audioLevelDry, setAudioLevelDry] = useState(0)
  const [audioLevelWet, setAudioLevelWet] = useState(0)

  const updateSynthParam = useCallback((key, value) => {
    setSynthParams(p => ({ ...p, [key]: value }))
    if (synthRef.current) synthRef.current[key] = value
  }, [])

  const updateDelayParam = useCallback((key, value) => {
    setDelayParams(p => ({ ...p, [key]: value }))
    if (delayRef.current) delayRef.current[key] = value
  }, [])

  const updateReverbParam = useCallback((key, value) => {
    setReverbParams(p => ({ ...p, [key]: value }))
    if (reverbRef.current && !(key === 'wet' && !reverbEnabled)) reverbRef.current[key] = value
  }, [reverbEnabled])

  const updatePhaserParam = useCallback((key, value) => {
    setPhaserParams(p => ({ ...p, [key]: value }))
    if (phaserRef.current && !(key === 'wet' && !phaserEnabled)) phaserRef.current[key] = value
  }, [phaserEnabled])

  const updateWidenerParam = useCallback((key, value) => {
    setWidenerParams(p => ({ ...p, [key]: value }))
    if (widenerRef.current) widenerRef.current[key] = value
  }, [])

  const togglePhaser = useCallback(() => {
    setPhaserEnabled(on => {
      const next = !on
      if (phaserRef.current) {
        const ctx = phaserRef.current._wetGain.context
        phaserRef.current._wetGain.gain.setTargetAtTime(
          next ? phaserParams.wet : 0, ctx.currentTime, 0.02
        )
      }
      return next
    })
  }, [phaserParams.wet])

  const toggleReverb = useCallback(() => {
    setReverbEnabled(on => {
      const next = !on
      if (reverbRef.current) {
        const ctx = reverbRef.current._wetGain.context
        reverbRef.current._wetGain.gain.setTargetAtTime(
          next ? reverbParams.wet : 0, ctx.currentTime, 0.02
        )
      }
      return next
    })
  }, [reverbParams.wet])

  const enableMidi = useCallback(async () => {
    await initAudio()
    if (midiRef.current) return
    midiRef.current = new MidiController({
      onNoteOn: (freq, midi, velocity) => {
        synthRef.current?.noteOn(freq, velocity, midi)
        setActiveMidis(s => new Set([...s, midi]))
      },
      onNoteOff: (midi) => {
        synthRef.current?.noteOff(midi)
        setActiveMidis(s => { const n = new Set(s); n.delete(midi); return n })
      },
      onCc: (cc, value) => {
        if (cc === 1) updateSynthParam('cutoff', 200 + value * 7800)
        if (cc === 11) updateDelayParam('wet', value)
      },
    })
    setMidiEnabled(true)
  }, [initAudio, updateSynthParam, updateDelayParam])

  const handleNoteOn = useCallback(async (freq, midi, velocity = 1) => {
    touchUnlock() // synchronous iOS gesture unlock, must precede any await
    await initAudio()
    synthRef.current?.noteOn(freq, velocity, midi)
    setActiveMidis(s => new Set([...s, midi]))
    setIsRunning(true)
  }, [initAudio])

  const handleNoteOff = useCallback((midi) => {
    synthRef.current?.noteOff(midi)
    setActiveMidis(s => { const n = new Set(s); n.delete(midi); return n })
  }, [])

  const handleStop = useCallback(() => {
    synthRef.current?.noteOff()
    delayRef.current?.stop()
    setActiveMidis(new Set())
    setIsRunning(false)
  }, [])

  const [isFullscreen, setIsFullscreen] = useState(false)


  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.()?.catch?.(() => {})
    } else {
      document.exitFullscreen?.()
    }
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      midiRef.current?.destroy()
    }
  }, [])

  return (
    <div className={`app${theme !== 'default' ? ` theme-${theme}` : ''}`}>
      <header>
        <div className="header-title">
          <h1>JodyTronics</h1>
          <p className="header-subtitle">A web app version of Frippertronics</p>
        </div>
        <div className="theme-switcher">
          {['default', 'vector', 'psychedelic'].map(t => (
            <button
              key={t}
              className={`theme-btn${theme === t ? ' theme-btn--active' : ''}`}
              onClick={() => setTheme(t)}
            >{t}</button>
          ))}
        </div>
        <div className="header-spacer" />
        <div className="header-volume">
          <label className="header-volume-label">vol</label>
          <input
            type="range" min={0} max={1} step={0.01} value={volume}
            className="volume-slider"
            onChange={e => {
              const v = parseFloat(e.target.value)
              setVolume(v)
              if (masterGainRef.current) {
                const gain = v === 0 ? 0 : 0.3 * Math.pow(v, 2.5)
                masterGainRef.current.gain.setTargetAtTime(gain, masterGainRef.current.context.currentTime, 0.02)
              }
            }}
          />
        </div>
        <button
          className={`midi-btn ${midiEnabled ? 'midi-btn--on' : ''}`}
          onClick={enableMidi}
          title="Enable MIDI controller"
        >midi</button>
        <button className="stop-btn" onClick={handleStop}>stop</button>
        <button className="fullscreen-btn" onClick={toggleFullscreen} title="Toggle fullscreen">
          {isFullscreen
            ? <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor"><path d="M4 0H0v4h1.5V1.5H4V0zM8 0v1.5h2.5V4H12V0H8zM0 8v4h4v-1.5H1.5V8H0zM10.5 10.5H8V12h4V8h-1.5v2.5z"/></svg>
            : <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor"><path d="M0 4V0h4v1.5H1.5V4H0zM8 0h4v4h-1.5V1.5H8V0zM0 8h1.5v2.5H4V12H0V8zM10.5 8H12v4H8v-1.5h2.5V8z"/></svg>
          }
        </button>
      </header>

      <TapeMachines isRunning={isRunning} audioLevelDry={audioLevelDry} audioLevelWet={audioLevelWet} />

      {import.meta.env.DEV && (
        <Presets
          currentSynth={synthParams}
          currentDelay={delayParams}
          currentWidener={widenerParams}
          onLoad={({ synth, delay, widener }) => {
            Object.entries(synth).forEach(([k, v]) => updateSynthParam(k, v))
            Object.entries(delay).forEach(([k, v]) => updateDelayParam(k, v))
            if (widener) Object.entries(widener).forEach(([k, v]) => updateWidenerParam(k, v))
          }}
        />
      )}

      <div className="panels">

        <div className={`panel${collapsed['delay'] ? ' panel--collapsed' : ''}`} id="delay-panel" onClick={() => { if (collapsed['delay']) toggleCollapse('delay') }}>
          <div className="panel-title">
            Tape Delay
            <button className="collapse-btn" onClick={(e) => { e.stopPropagation(); toggleCollapse('delay') }} aria-label="collapse">
              <span className="collapse-arrow" />
            </button>
          </div>
          {!collapsed['delay'] && (
            <div className="knobs-grid">
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
              <Knob label="width" min={0} max={1} value={widenerParams.width} defaultValue={0.4} decimals={2}
                onChange={v => updateWidenerParam('width', v)} />
            </div>
          )}
        </div>

        <div className="panel-row">
          <div className={`panel${collapsed['phaser'] ? ' panel--collapsed' : ''}`} id="phaser-panel" onClick={() => { if (collapsed['phaser']) toggleCollapse('phaser') }}>
            <div className="panel-title">
              Phaser
              <button className={`fx-btn ${phaserEnabled ? 'fx-btn--on' : ''}`} onClick={(e) => { e.stopPropagation(); togglePhaser() }}>
                {phaserEnabled ? 'on' : 'off'}
              </button>
              <button className="collapse-btn" onClick={(e) => { e.stopPropagation(); toggleCollapse('phaser') }} aria-label="collapse">
                <span className="collapse-arrow" />
              </button>
            </div>
            {!collapsed['phaser'] && (
              <div className="knobs-grid knobs-grid--4">
                <Knob label="rate" min={0.05} max={4} value={phaserParams.rate} defaultValue={0.4} decimals={2} unit="hz"
                  onChange={v => updatePhaserParam('rate', v)} />
                <Knob label="depth" min={0} max={1500} value={phaserParams.depth} defaultValue={800} decimals={0}
                  onChange={v => updatePhaserParam('depth', v)} />
                <Knob label="center" min={200} max={4000} value={phaserParams.center} defaultValue={1000} decimals={0} unit="hz"
                  onChange={v => updatePhaserParam('center', v)} />
                <Knob label="wet mix" min={0} max={1} value={phaserParams.wet} defaultValue={0.5} decimals={2}
                  onChange={v => updatePhaserParam('wet', v)} />
              </div>
            )}
          </div>

          <div className={`panel${collapsed['reverb'] ? ' panel--collapsed' : ''}`} id="reverb-panel" onClick={() => { if (collapsed['reverb']) toggleCollapse('reverb') }}>
            <div className="panel-title">
              Reverb
              <button className={`fx-btn ${reverbEnabled ? 'fx-btn--on' : ''}`} onClick={(e) => { e.stopPropagation(); toggleReverb() }}>
                {reverbEnabled ? 'on' : 'off'}
              </button>
              <button className="collapse-btn" onClick={(e) => { e.stopPropagation(); toggleCollapse('reverb') }} aria-label="collapse">
                <span className="collapse-arrow" />
              </button>
            </div>
            {!collapsed['reverb'] && (
              <div className="knobs-grid knobs-grid--4">
                <Knob label="decay" min={0.2} max={10} value={reverbParams.decay} defaultValue={2.5} decimals={1} unit="s"
                  onChange={v => updateReverbParam('decay', v)} />
                <Knob label="damping" min={500} max={18000} value={reverbParams.damping} defaultValue={4000} decimals={0} unit="hz"
                  onChange={v => updateReverbParam('damping', v)} />
                <Knob label="pre-delay" min={0} max={0.08} value={reverbParams.preDelay} defaultValue={0.02} decimals={3} unit="s"
                  onChange={v => updateReverbParam('preDelay', v)} />
                <Knob label="wet mix" min={0} max={1} value={reverbParams.wet} defaultValue={0.3} decimals={2}
                  onChange={v => updateReverbParam('wet', v)} />
              </div>
            )}
          </div>
        </div>

        <div className={`panel${collapsed['synth'] ? ' panel--collapsed' : ''}`} id="synth-panel" onClick={() => { if (collapsed['synth']) toggleCollapse('synth') }}>
          <div className="panel-title">
            Synthesizer
            <button className="collapse-btn" onClick={(e) => { e.stopPropagation(); toggleCollapse('synth') }} aria-label="collapse">
              <span className="collapse-arrow" />
            </button>
          </div>
          {!collapsed['synth'] && (
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
          )}
        </div>
      </div>

      <footer>
        <Keyboard onNoteOn={handleNoteOn} onNoteOff={handleNoteOff} activeMidis={activeMidis} />
      </footer>
    </div>
  )
}
