import { useRef, useState, useEffect } from 'react'

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
const BLACK_SEMITONES = new Set([1, 3, 6, 8, 10])

function midiToFreq(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12)
}

function makeKeys(startMidi, endMidi) {
  return Array.from({ length: endMidi - startMidi + 1 }, (_, i) => {
    const midi = startMidi + i
    const semitone = midi % 12
    return { midi, semitone, black: BLACK_SEMITONES.has(semitone), label: NOTE_NAMES[semitone] + Math.floor(midi / 12 - 1) }
  })
}

function useKeyRange() {
  const [width, setWidth] = useState(() => window.innerWidth)
  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  if (width < 500) return { start: 48, end: 71 } // C3–B4, 2 octaves
  if (width < 750) return { start: 48, end: 83 } // C3–B5, 3 octaves
  return { start: 36, end: 84 }                  // C2–C6, 4 octaves
}

function keyVelocity(e, key) {
  const rect = key.getBoundingClientRect()
  const y = (e.clientY - rect.top) / rect.height
  return Math.max(0.05, Math.min(1, y))
}

export function Keyboard({ onNoteOn, onNoteOff, activeMidis }) {
  const { start, end } = useKeyRange()
  const keys = makeKeys(start, end)
  const pointerNoteRef = useRef(new Map())

  const onPointerDown = (e) => {
    const key = e.target.closest('[data-midi]')
    if (!key) return
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    const midi = parseInt(key.dataset.midi)
    pointerNoteRef.current.set(e.pointerId, midi)
    onNoteOn?.(midiToFreq(midi), midi, keyVelocity(e, key))
  }

  const onPointerMove = (e) => {
    if (e.buttons === 0) return
    const el = document.elementFromPoint(e.clientX, e.clientY)
    const key = el?.closest('[data-midi]')
    if (!key) return
    const midi = parseInt(key.dataset.midi)
    const prev = pointerNoteRef.current.get(e.pointerId)
    if (midi !== prev) {
      if (prev != null) onNoteOff?.(prev)
      pointerNoteRef.current.set(e.pointerId, midi)
      onNoteOn?.(midiToFreq(midi), midi, keyVelocity(e, key))
    }
  }

  const onPointerUp = (e) => {
    const midi = pointerNoteRef.current.get(e.pointerId)
    if (midi != null) onNoteOff?.(midi)
    pointerNoteRef.current.delete(e.pointerId)
  }

  return (
    <div
      className="keyboard"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {keys.map(({ midi, black, label }) => (
        <div
          key={midi}
          className={`key ${black ? 'key--black' : 'key--white'} ${activeMidis?.has(midi) ? 'key--active' : ''}`}
          data-midi={midi}
          title={label}
        />
      ))}
    </div>
  )
}
