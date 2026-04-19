const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
const BLACK_SEMITONES = new Set([1, 3, 6, 8, 10])

function midiToFreq(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12)
}

// C2 (36) to C6 (84)
const KEYS = Array.from({ length: 49 }, (_, i) => {
  const midi = 36 + i
  const semitone = midi % 12
  return {
    midi,
    semitone,
    black: BLACK_SEMITONES.has(semitone),
    label: NOTE_NAMES[semitone] + Math.floor(midi / 12 - 1),
  }
})

function keyVelocity(e, key) {
  const rect = key.getBoundingClientRect()
  const y = (e.clientY - rect.top) / rect.height
  return Math.max(0.05, Math.min(1, y))
}

export function Keyboard({ onNoteOn, onNoteOff, activeMidi }) {
  const onPointerDown = (e) => {
    const key = e.target.closest('[data-midi]')
    if (!key) return
    e.preventDefault()
    const midi = parseInt(key.dataset.midi)
    onNoteOn?.(midiToFreq(midi), midi, keyVelocity(e, key))
  }

  const onPointerMove = (e) => {
    if (e.buttons === 0) return
    const el = document.elementFromPoint(e.clientX, e.clientY)
    const key = el?.closest('[data-midi]')
    if (!key) return
    const midi = parseInt(key.dataset.midi)
    if (midi !== activeMidi) {
      onNoteOn?.(midiToFreq(midi), midi, keyVelocity(e, key))
    }
  }

  return (
    <div
      className="keyboard"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={() => onNoteOff?.()}
      onPointerLeave={() => onNoteOff?.()}
    >
      {KEYS.map(({ midi, black, label }) => (
        <div
          key={midi}
          className={`key ${black ? 'key--black' : 'key--white'} ${activeMidi === midi ? 'key--active' : ''}`}
          data-midi={midi}
          title={label}
        />
      ))}
    </div>
  )
}
