import { useRef } from 'react'

const SIZE = 56
const CX = SIZE / 2
const CY = SIZE / 2
const R = 22
const START = -135 * (Math.PI / 180)
const END = 135 * (Math.PI / 180)

function arcPath(startAngle, endAngle) {
  const x1 = CX + R * Math.cos(startAngle)
  const y1 = CY + R * Math.sin(startAngle)
  const x2 = CX + R * Math.cos(endAngle)
  const y2 = CY + R * Math.sin(endAngle)
  const largeArc = endAngle - startAngle > Math.PI ? 1 : 0
  return `M ${x1} ${y1} A ${R} ${R} 0 ${largeArc} 1 ${x2} ${y2}`
}

export function Knob({ label, min, max, value, defaultValue, decimals = 1, unit = '', onChange }) {
  const dragRef  = useRef(null)
  const glowStyle = useRef({
    '--glow-duration': `${2.5 + Math.random() * 4}s`,
    '--glow-delay':    `${-(Math.random() * 6)}s`,
  })

  const t = (value - min) / (max - min)
  const angle = START + t * (END - START)
  const dotX = CX + R * Math.cos(angle)
  const dotY = CY + R * Math.sin(angle)
  const display = value.toFixed(decimals) + (unit ? '\u00a0' + unit : '')

  const onPointerDown = (e) => {
    e.preventDefault()
    dragRef.current = { startY: e.clientY, startValue: value }
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const onPointerMove = (e) => {
    if (!dragRef.current) return
    const dy = dragRef.current.startY - e.clientY
    const delta = (dy / 150) * (max - min)
    const next = Math.min(max, Math.max(min, dragRef.current.startValue + delta))
    onChange?.(next)
  }

  const onPointerUp = () => { dragRef.current = null }
  const onLostPointerCapture = () => { dragRef.current = null }

  const onDoubleClick = () => { onChange?.(defaultValue ?? min) }

  return (
    <div className="knob" style={glowStyle.current}>
      <svg
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onLostPointerCapture={onLostPointerCapture}
        onDoubleClick={onDoubleClick}
      >
        <path d={arcPath(START, END)} fill="none" stroke="var(--knob-track)" strokeWidth="3" strokeLinecap="round" />
        <g className="knob-glow-group">
          <path d={arcPath(START, angle)} fill="none" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" />
          <circle cx={dotX} cy={dotY} r="3" fill="var(--accent)" />
        </g>
      </svg>
      <div className="knob-value">{display}</div>
      <div className="knob-label">{label}</div>
    </div>
  )
}
