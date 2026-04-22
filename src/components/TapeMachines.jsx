import { useRef } from 'react'
import './TapeMachines.css'
import { OpArtCanvas } from './OpArtCanvas.jsx'

const REEL_R     = 52
const HUB_R      = 20
const HUB_HOLE_R = 7
const WIN_OUT = REEL_R - 6
const WIN_IN  = HUB_R

function makeSector(r1, r2, startDeg, endDeg) {
  const s = (startDeg * Math.PI) / 180
  const e = (endDeg   * Math.PI) / 180
  const x1 = Math.cos(s) * r1, y1 = Math.sin(s) * r1
  const x2 = Math.cos(s) * r2, y2 = Math.sin(s) * r2
  const x3 = Math.cos(e) * r2, y3 = Math.sin(e) * r2
  const x4 = Math.cos(e) * r1, y4 = Math.sin(e) * r1
  const large = endDeg - startDeg > 180 ? 1 : 0
  return `M ${x1},${y1} L ${x2},${y2} A ${r2},${r2},0,${large},1,${x3},${y3} L ${x4},${y4} A ${r1},${r1},0,${large},0,${x1},${y1} Z`
}

const SPOKE_PATHS = [0, 120, 240].map(a => makeSector(WIN_IN, WIN_OUT, a - 20, a + 20))

// Tangent point on circle (cx,cy,r) from external point (px,py).
// Picks the tangent on the side facing the guide: left-side when guide is left of reel, right-side when right.
function tangentPt(cx, cy, r, px, py) {
  const dx = px - cx, dy = py - cy
  const d = Math.sqrt(dx * dx + dy * dy)
  const phi = Math.atan2(dy, dx)
  const alpha = Math.acos(Math.min(1, r / d))
  const sign = dx <= 0 ? 1 : -1
  const theta = phi + sign * alpha
  return [cx + r * Math.cos(theta), cy + r * Math.sin(theta)]
}

function Reel({ cx, cy, tapeR = 30, ccw = false, isRunning }) {
  return (
    <g transform={`translate(${cx}, ${cy})`}>
      {/* Wound tape */}
      <circle r={tapeR} className="tape_on_a_reel" fill="var(--tape)" />
      <circle r={tapeR} fill="none" stroke="var(--tape-stroke)" strokeWidth="1.5" opacity="0.5" />

      <g className={`reel ${isRunning ? 'reel--spinning' : ''} ${ccw ? 'reel--ccw' : ''}`}>

        {SPOKE_PATHS.map((d, i) => (
          <path key={i} d={d} fill="url(#reel-plate-grad)" />
        ))}

        <circle r={WIN_OUT + 3} fill="none" stroke="var(--reel-rim)" strokeWidth={REEL_R - WIN_OUT} />
        <circle r={REEL_R}      fill="none" stroke="var(--reel-plate-hi)" strokeWidth="1"   opacity="0.7" />
        <circle r={WIN_OUT}     fill="none" stroke="var(--reel-edge)" strokeWidth="0.8" opacity="0.6" />

        <circle r={HUB_R} fill="url(#reel-hub-grad)" />
        <circle r={HUB_R} fill="none" stroke="var(--reel-hub-hi)" strokeWidth="1.5" />
        <circle r={HUB_R - 5} fill="none" stroke="var(--reel-hub-lo)" strokeWidth="1" opacity="0.55" />

        <circle r={HUB_HOLE_R} fill="#050608" />
        <circle r={HUB_HOLE_R * 0.5} fill="#0a0c12" />

      </g>
    </g>
  )
}

// phase: 'bg' = body fill only, 'body' = hardware (no fill), 'reels' = reels only
// reels: 'both' | 'left' | 'right' — which reels are physically present
function Machine({ x, y, w = 270, h = 185, topTrim = 0, isRunning, leftTapeR = 32, rightTapeR = 26, audioLevel = 0, phase, reels = 'both' }) {
  const lx = x + 74
  const ly = y + 80
  const rx = x + w - 74
  const ry = y + 77
  const hx = x + w / 2
  const hy = y + 145

  const showBg    = !phase || phase === 'bg'
  const showBody  = !phase || phase === 'body'
  const showReels = !phase || phase === 'reels'

  return (
    <g>
      {showBg && (
        <rect x={x} y={y + topTrim} width={w} height={h - topTrim} rx="8" fill="var(--machine-body)" />
      )}

      {showBody && <>
        {/* Body stroke */}
        <rect x={x + 1} y={y + topTrim + 1} width={w - 2} height={h - topTrim - 2} rx="7" fill="none" stroke="var(--machine-body-stroke)" strokeWidth="1" />

        {/* Bottom control strip — full-width, flush with bottom and side edges */}
        {(() => {
          const sp = `M ${x},${y+h-22} L ${x+w},${y+h-22} L ${x+w},${y+h-8} Q ${x+w},${y+h} ${x+w-8},${y+h} L ${x+8},${y+h} Q ${x},${y+h} ${x},${y+h-8} Z`
          return <>
            <defs>
              <linearGradient id={`rainbow-${x}-${y}`} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%"   stopColor="var(--strip-1)" />
                <stop offset="33%"  stopColor="var(--strip-1)" />
                <stop offset="33%"  stopColor="var(--strip-2)" />
                <stop offset="66%"  stopColor="var(--strip-2)" />
                <stop offset="66%"  stopColor="var(--strip-3)" />
                <stop offset="100%" stopColor="var(--strip-3)" />
              </linearGradient>
            </defs>
            <path d={sp} fill={`url(#rainbow-${x}-${y})`} />
            <path d={sp} fill="var(--machine-body)" opacity="0.5" />
            <circle cx={x + 22} cy={y + h - 11} r="4" fill={isRunning ? 'var(--led-on)' : 'var(--led-off)'} stroke="var(--machine-body-stroke)" strokeWidth="1" />
            <rect x={x + w - 160} y={y + h - 19} width="150" height="16" rx="4" fill="var(--meter-housing)" stroke="var(--machine-body-stroke)" strokeWidth="1" />
            <rect x={x + w - 156} y={y + h - 17} width="142" height="12" rx="3" fill="var(--meter-inner)" />
            {Array.from({ length: 28 }, (_, i) => {
              const threshold = (i + 1) / 28
              const isLit = audioLevel >= threshold
              const fill = i < 8 ? 'var(--vu-low)' : i < 16 ? 'var(--vu-mid)' : 'var(--vu-high)'
              return (
                <rect
                  key={`led-${i}`}
                  x={x + w - 154 + i * 5}
                  y={y + h - 16}
                  width="3"
                  height="8"
                  rx="1"
                  fill={isLit ? fill : 'var(--vu-bg)'}
                  opacity={isLit ? 1 : 0.35}
                />
              )
            })}
          </>
        })()}

        {/* Tape path — straight tangent lines from guide rollers to reel surfaces */}
        {(reels === 'both' || reels === 'left') && (() => {
          const [tx, ty] = tangentPt(lx, ly, leftTapeR, hx - 78, hy + 4)
          return <line x1={tx} y1={ty} x2={hx - 78} y2={hy + 4} stroke="var(--tape-travel)" strokeWidth="1.5" opacity="0.9" />
        })()}
        <line x1={hx - 78} y1={hy + 4} x2={hx + 78} y2={hy + 4} stroke="var(--tape-travel)" strokeWidth="1.5" opacity="0.9" />
        {(reels === 'both' || reels === 'right') && (() => {
          const [tx, ty] = tangentPt(rx, ry, rightTapeR, hx + 78, hy + 4)
          return <line x1={hx + 78} y1={hy + 4} x2={tx} y2={ty} stroke="var(--tape-travel)" strokeWidth="1.5" opacity="0.9" />
        })()}

        {/* Empty spindles where inner reels have been removed */}
        {(reels === 'left') && (() => {
          const bx = rx, by = ry
          return <g>
            <circle cx={bx} cy={by} r={REEL_R - 16} fill="#111820" />
            <circle cx={bx} cy={by} r={REEL_R - 16} fill="none" stroke="#0a0f16" strokeWidth="1.5" />
            <circle cx={bx} cy={by} r={22} fill="#2a2e34" stroke="#1e2228" strokeWidth="1" />
            {[0, 90, 180, 270].map(a => {
              const rad = a * Math.PI / 180
              return <circle key={a} cx={bx + Math.cos(rad) * 13} cy={by + Math.sin(rad) * 13} r="2.5" fill="#1a1e24" stroke="#3a3e44" strokeWidth="0.75" />
            })}
            <circle cx={bx} cy={by} r="5" fill="#1c2026" stroke="#3a3e44" strokeWidth="0.75" />
            <circle cx={bx} cy={by} r="2" fill="#101418" />
          </g>
        })()}
        {(reels === 'right') && (() => {
          const bx = lx, by = ly
          return <g>
            <circle cx={bx} cy={by} r={REEL_R - 16} fill="#111820" />
            <circle cx={bx} cy={by} r={REEL_R - 16} fill="none" stroke="#0a0f16" strokeWidth="1.5" />
            <circle cx={bx} cy={by} r={22} fill="#2a2e34" stroke="#1e2228" strokeWidth="1" />
            {[0, 90, 180, 270].map(a => {
              const rad = a * Math.PI / 180
              return <circle key={a} cx={bx + Math.cos(rad) * 13} cy={by + Math.sin(rad) * 13} r="2.5" fill="#1a1e24" stroke="#3a3e44" strokeWidth="0.75" />
            })}
            <circle cx={bx} cy={by} r="5" fill="#1c2026" stroke="#3a3e44" strokeWidth="0.75" />
            <circle cx={bx} cy={by} r="2" fill="#101418" />
          </g>
        })()}

        {/* Guide posts flanking head assembly */}
        <circle cx={hx - 78} cy={hy + 4} r="5" fill="var(--machine-body-stroke)" stroke="var(--reel-edge)" strokeWidth="1.5" />
        <circle cx={hx - 78} cy={hy + 4} r="2" fill="var(--reel-hub-hi)" />
        <circle cx={hx + 78} cy={hy + 4} r="5" fill="var(--machine-body-stroke)" stroke="var(--reel-edge)" strokeWidth="1.5" />
        <circle cx={hx + 78} cy={hy + 4} r="2" fill="var(--reel-hub-hi)" />

        {/* Head assembly recess */}
        <rect x={hx - 30} y={hy - 18} width={60} height={26} rx="2" fill="var(--machine-bg)" />

        {/* Shared mounting base plate */}
        <rect x={hx - 28} y={hy + 4} width={56} height={4} rx="1.5" fill="var(--machine-body-stroke)" stroke="var(--machine-body-stroke)" strokeWidth="0.75" />

        {/* Erase head (leftmost) */}
        <rect x={hx - 24} y={hy - 12} width={11} height={16} rx="1.5" fill="var(--machine-body)" />
        <rect x={hx - 23} y={hy - 11} width={9}  height={14} rx="1"   fill="none" stroke="var(--machine-body-stroke)" strokeWidth="0.75" />
        <line x1={hx - 23} y1={hy + 2} x2={hx - 14} y2={hy + 2} stroke="var(--reel-edge)" strokeWidth="1.5" />
        <line x1={hx - 23} y1={hy + 2} x2={hx - 14} y2={hy + 2} stroke="var(--reel-plate-mid)" strokeWidth="0.6" opacity="0.7" />

        {/* Record head (center) — taller, amber gap */}
        <rect x={hx - 6}  y={hy - 16} width={12} height={20} rx="1.5" fill="var(--machine-body-stroke)" />
        <rect x={hx - 5}  y={hy - 15} width={10} height={18} rx="1"   fill="none" stroke="var(--machine-body-stroke)" strokeWidth="0.75" />
        <line x1={hx - 5} y1={hy + 2}  x2={hx + 5} y2={hy + 2}  stroke="var(--head-gap)" strokeWidth="1.5" />
        <line x1={hx - 5} y1={hy + 2}  x2={hx + 5} y2={hy + 2}  stroke="var(--head-gap-shine)" strokeWidth="0.7" opacity="0.85" />

        {/* Playback head (rightmost) */}
        <rect x={hx + 13} y={hy - 12} width={11} height={16} rx="1.5" fill="var(--machine-body)" />
        <rect x={hx + 14} y={hy - 11} width={9}  height={14} rx="1"   fill="none" stroke="var(--machine-body-stroke)" strokeWidth="0.75" />
        <line x1={hx + 14} y1={hy + 2} x2={hx + 23} y2={hy + 2} stroke="var(--reel-edge)" strokeWidth="1.5" />
        <line x1={hx + 14} y1={hy + 2} x2={hx + 23} y2={hy + 2} stroke="var(--reel-plate-mid)" strokeWidth="0.6" opacity="0.7" />
      </>}

      {showReels && <>
        {(reels === 'both' || reels === 'left') && (
          <Reel cx={lx} cy={ly} tapeR={leftTapeR}  ccw={true}  isRunning={isRunning} />
        )}
        {(reels === 'both' || reels === 'right') && (
          <Reel cx={rx} cy={ry} tapeR={rightTapeR} ccw={true} isRunning={isRunning} />
        )}
      </>}

    </g>
  )
}

export function TapeMachines({ isRunning, audioLevelDry = 0, audioLevelWet = 0 }) {
  const dryRef = useRef(0)
  const wetRef = useRef(0)
  dryRef.current = audioLevelDry
  wetRef.current = audioLevelWet

  const W = 720, H = 173
  const topTrim = 20
  const m1x = 10,  m1y = 4 - topTrim, mw = 268, mh = 185
  const m2x = 442, m2y = 4 - topTrim

  const m1hx = m1x + mw / 2, m1hy = m1y + 145
  const m2hx = m2x + mw / 2, m2hy = m2y + 145
  const exitX  = m1hx + 78, exitY  = m1hy + 4
  const entryX = m2hx - 78, entryY = m2hy + 4
  const droopY = Math.max(exitY, entryY) + 10

  const sharedProps = { w: mw, h: mh, topTrim, isRunning }
  const m1Props = { ...sharedProps, x: m1x, y: m1y, reels: 'left',  audioLevel: audioLevelDry,  leftTapeR:  42 }
  const m2Props = { ...sharedProps, x: m2x, y: m2y, reels: 'right', audioLevel: audioLevelWet, rightTapeR: 40 }

  const defs = (
    <defs>
      <radialGradient id="reel-plate-grad" cx="38%" cy="33%" r="65%">
        <stop offset="0%"   stopColor="var(--reel-plate-hi)" />
        <stop offset="55%"  stopColor="var(--reel-plate-mid)" />
        <stop offset="100%" stopColor="var(--reel-plate-lo)" />
      </radialGradient>
      <radialGradient id="reel-hub-grad" cx="36%" cy="30%" r="70%">
        <stop offset="0%"   stopColor="var(--reel-hub-hi)" />
        <stop offset="100%" stopColor="var(--reel-hub-lo)" />
      </radialGradient>
    </defs>
  )

  return (
    <div className="tape-machines">

      {/* Layer 1 (back): SVG background + machine body fills */}
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" className="tape-machines__bg">
        {defs}
        <rect width={W} height={H} fill="var(--machine-bg)" />
        <Machine phase="bg" {...m1Props} />
        <Machine phase="bg" {...m2Props} />
      </svg>

      {/* Layer 2 (middle): op-art canvases — above body fill, below hardware */}
      <OpArtCanvas className="machine-op-art machine-op-art--left"  mode={4} audioLevelRef={dryRef} color1="#000000" color2="#888888" />
      <OpArtCanvas className="machine-op-art machine-op-art--right" mode={3} audioLevelRef={wetRef} color1="#000000" color2="#888888" />

      {/* Layer 3 (front): hardware, tape, reels — on top of op-art */}
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" className="tape-machines__fg">
        {defs}
        <Machine phase="body" {...m1Props} />
        <Machine phase="body" {...m2Props} />
        <path
          d={`M ${exitX} ${exitY} C ${exitX + 60} ${droopY} ${entryX - 60} ${droopY} ${entryX} ${entryY}`}
          fill="none" stroke="var(--tape-travel)" strokeWidth="1.5" opacity="0.85"
        />
        <Machine phase="reels" {...m1Props} />
        <Machine phase="reels" {...m2Props} />
      </svg>

    </div>
  )
}
