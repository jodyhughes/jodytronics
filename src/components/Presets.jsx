import { useState } from 'react'
import { loadPresets, savePresets } from '../audio/presets.js'
import './Presets.css'

export function Presets({ currentSynth, currentDelay, currentWidener, onLoad }) {
  const [presets, setPresets] = useState(() => loadPresets())
  const [selected, setSelected] = useState('')
  const [name, setName] = useState('')
  const [copied, setCopied] = useState(false)

  const save = () => {
    const trimmed = name.trim()
    if (!trimmed) return
    const preset = { name: trimmed, synth: currentSynth, delay: currentDelay, widener: currentWidener }
    const updated = [...presets.filter(p => p.name !== trimmed), preset]
      .sort((a, b) => a.name.localeCompare(b.name))
    savePresets(updated)
    setPresets(updated)
    setSelected(trimmed)
    setName('')
  }

  const load = () => {
    const preset = presets.find(p => p.name === selected)
    if (preset) onLoad(preset)
  }

  const remove = () => {
    const updated = presets.filter(p => p.name !== selected)
    savePresets(updated)
    setPresets(updated)
    setSelected('')
  }

  const exportPreset = () => {
    const preset = presets.find(p => p.name === selected)
    if (!preset) return
    navigator.clipboard.writeText(JSON.stringify(preset, null, 2))
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="presets">
      <span className="presets-label">presets</span>

      <select
        className="presets-select"
        value={selected}
        onChange={e => setSelected(e.target.value)}
      >
        <option value="">— select —</option>
        {presets.map(p => (
          <option key={p.name} value={p.name}>{p.name}</option>
        ))}
      </select>

      <button className="preset-btn" disabled={!selected} onClick={load}>load</button>
      <button className="preset-btn" disabled={!selected} onClick={remove}>delete</button>
      <button className="preset-btn" disabled={!selected} onClick={exportPreset}>
        {copied ? 'copied!' : 'export'}
      </button>

      <div className="presets-divider" />

      <input
        className="presets-input"
        placeholder="preset name"
        value={name}
        onChange={e => setName(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && save()}
      />
      <button className="preset-btn preset-btn--save" disabled={!name.trim()} onClick={save}>
        save
      </button>
    </div>
  )
}
