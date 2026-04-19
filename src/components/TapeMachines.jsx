import './TapeMachines.css'

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
      <circle r={tapeR} className="tape_on_a_reel" fill="#7a3c1e" />
      <circle r={tapeR} fill="none" stroke="#a85030" strokeWidth="1.5" opacity="0.5" />

      <g className={`reel ${isRunning ? 'reel--spinning' : ''} ${ccw ? 'reel--ccw' : ''}`}>

        {SPOKE_PATHS.map((d, i) => (
          <path key={i} d={d} fill="url(#reel-plate-grad)" />
        ))}

        <circle r={WIN_OUT + 3} fill="none" stroke="#b4bac2" strokeWidth={REEL_R - WIN_OUT} />
        <circle r={REEL_R}      fill="none" stroke="#d0d5dc" strokeWidth="1"   opacity="0.7" />
        <circle r={WIN_OUT}     fill="none" stroke="#505864" strokeWidth="0.8" opacity="0.6" />

        <circle r={HUB_R} fill="url(#reel-hub-grad)" />
        <circle r={HUB_R} fill="none" stroke="#2c3040" strokeWidth="1.5" />
        <circle r={HUB_R - 5} fill="none" stroke="#1c2030" strokeWidth="1" opacity="0.55" />

        <circle r={HUB_HOLE_R} fill="#050608" />
        <circle r={HUB_HOLE_R * 0.5} fill="#0a0c12" />

      </g>
    </g>
  )
}

// phase: 'body' = everything except reels, 'reels' = reels only, default = all
// reels: 'both' | 'left' | 'right' — which reels are physically present
function Machine({ x, y, w = 270, h = 210, isRunning, leftTapeR = 32, rightTapeR = 26, audioLevel = 0, phase, reels = 'both' }) {
  const lx = x + 74
  const ly = y + 96
  const rx = x + w - 74
  const ry = y + 93
  const hx = x + w / 2
  const hy = y + 170

  const showBody  = !phase || phase === 'body'
  const showReels = !phase || phase === 'reels'

  return (
    <g>
      {showBody && <>
        {/* Body */}
        <rect x={x} y={y} width={w} height={h} rx="8" fill="#1c2a42" />
        <rect x={x + 1} y={y + 1} width={w - 2} height={h - 2} rx="7" fill="none" stroke="#2a3e5a" strokeWidth="1" />

        {/* Bottom control strip — full-width, flush with bottom and side edges */}
        {(() => {
          const sp = `M ${x},${y+h-22} L ${x+w},${y+h-22} L ${x+w},${y+h-8} Q ${x+w},${y+h} ${x+w-8},${y+h} L ${x+8},${y+h} Q ${x},${y+h} ${x},${y+h-8} Z`
          return <>
            <defs>
              <linearGradient id={`rainbow-${x}-${y}`} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%"   stopColor="#7a1a1a" />
                <stop offset="33%"  stopColor="#7a1a1a" />
                <stop offset="33%"  stopColor="#cc3318" />
                <stop offset="66%"  stopColor="#cc3318" />
                <stop offset="66%"  stopColor="#e06020" />
                <stop offset="100%" stopColor="#e06020" />
              </linearGradient>
            </defs>
            <path d={sp} fill={`url(#rainbow-${x}-${y})`} />
            <path d={sp} fill="#111c2e" opacity="0.5" />
            <circle cx={x + 22} cy={y + h - 11} r="4" fill={isRunning ? '#37c957' : '#d73a3a'} stroke="#2a3e5a" strokeWidth="1" />
            <rect x={x + w - 172} y={y + h - 21} width="150" height="18" rx="4" fill="#101826" stroke="#2a3e5a" strokeWidth="1" />
            <rect x={x + w - 168} y={y + h - 19} width="142" height="14" rx="3" fill="#15203f" />
            {Array.from({ length: 28 }, (_, i) => {
              const threshold = (i + 1) / 28
              const isLit = audioLevel >= threshold
              const fill = i < 8 ? '#d73a3a' : i < 16 ? '#f4b642' : '#43d855'
              return (
                <rect
                  key={`led-${i}`}
                  x={x + w - 166 + i * 5}
                  y={y + h - 18}
                  width="3"
                  height="10"
                  rx="1"
                  fill={isLit ? fill : '#1a2534'}
                  opacity={isLit ? 1 : 0.35}
                />
              )
            })}
          </>
        })()}

        {/* Tape path — straight tangent lines from guide rollers to reel surfaces */}
        {(reels === 'both' || reels === 'left') && (() => {
          const [tx, ty] = tangentPt(lx, ly, leftTapeR, hx - 78, hy + 4)
          return <line x1={tx} y1={ty} x2={hx - 78} y2={hy + 4} stroke="#7a4228" strokeWidth="1.5" opacity="0.9" />
        })()}
        <line x1={hx - 78} y1={hy + 4} x2={hx + 78} y2={hy + 4} stroke="#7a4228" strokeWidth="1.5" opacity="0.9" />
        {(reels === 'both' || reels === 'right') && (() => {
          const [tx, ty] = tangentPt(rx, ry, rightTapeR, hx + 78, hy + 4)
          return <line x1={hx + 78} y1={hy + 4} x2={tx} y2={ty} stroke="#7a4228" strokeWidth="1.5" opacity="0.9" />
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
        <circle cx={hx - 78} cy={hy + 4} r="5" fill="#2a3848" stroke="#4a5c70" strokeWidth="1.5" />
        <circle cx={hx - 78} cy={hy + 4} r="2" fill="#3a4e64" />
        <circle cx={hx + 78} cy={hy + 4} r="5" fill="#2a3848" stroke="#4a5c70" strokeWidth="1.5" />
        <circle cx={hx + 78} cy={hy + 4} r="2" fill="#3a4e64" />

        {/* Head assembly recess */}
        <rect x={hx - 30} y={hy - 18} width={60} height={26} rx="2" fill="#090e14" />

        {/* Shared mounting base plate */}
        <rect x={hx - 28} y={hy + 4} width={56} height={4} rx="1.5" fill="#1a2430" stroke="#243040" strokeWidth="0.75" />

        {/* Erase head (leftmost) */}
        <rect x={hx - 24} y={hy - 12} width={11} height={16} rx="1.5" fill="#1c2a3a" />
        <rect x={hx - 23} y={hy - 11} width={9}  height={14} rx="1"   fill="none" stroke="#2c3e52" strokeWidth="0.75" />
        <line x1={hx - 23} y1={hy + 2} x2={hx - 14} y2={hy + 2} stroke="#3e4e62" strokeWidth="1.5" />
        <line x1={hx - 23} y1={hy + 2} x2={hx - 14} y2={hy + 2} stroke="#7888a0" strokeWidth="0.6" opacity="0.7" />

        {/* Record head (center) — taller, amber gap */}
        <rect x={hx - 6}  y={hy - 16} width={12} height={20} rx="1.5" fill="#202e40" />
        <rect x={hx - 5}  y={hy - 15} width={10} height={18} rx="1"   fill="none" stroke="#304252" strokeWidth="0.75" />
        <line x1={hx - 5} y1={hy + 2}  x2={hx + 5} y2={hy + 2}  stroke="#b87820" strokeWidth="1.5" />
        <line x1={hx - 5} y1={hy + 2}  x2={hx + 5} y2={hy + 2}  stroke="#ffbe50" strokeWidth="0.7" opacity="0.85" />

        {/* Playback head (rightmost) */}
        <rect x={hx + 13} y={hy - 12} width={11} height={16} rx="1.5" fill="#1c2a3a" />
        <rect x={hx + 14} y={hy - 11} width={9}  height={14} rx="1"   fill="none" stroke="#2c3e52" strokeWidth="0.75" />
        <line x1={hx + 14} y1={hy + 2} x2={hx + 23} y2={hy + 2} stroke="#3e4e62" strokeWidth="1.5" />
        <line x1={hx + 14} y1={hy + 2} x2={hx + 23} y2={hy + 2} stroke="#7888a0" strokeWidth="0.6" opacity="0.7" />
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
  const W = 720, H = 235
  const m1x = 10,  m1y = 22, mw = 268, mh = 210
  const m2x = 442, m2y = 22

  const m1hx = m1x + mw / 2, m1hy = m1y + 170
  const m2hx = m2x + mw / 2, m2hy = m2y + 170
  const exitX  = m1hx + 78, exitY  = m1hy + 4
  const entryX = m2hx - 78, entryY = m2hy + 4
  const droopY = Math.max(exitY, entryY) + 10

  return (
    <div className="tape-machines">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block' }}>
        <defs>
          <radialGradient id="reel-plate-grad" cx="38%" cy="33%" r="65%">
            <stop offset="0%"   stopColor="#d4d8de" />
            <stop offset="55%"  stopColor="#aaafb8" />
            <stop offset="100%" stopColor="#828890" />
          </radialGradient>
          <radialGradient id="reel-hub-grad" cx="36%" cy="30%" r="70%">
            <stop offset="0%"   stopColor="#222630" />
            <stop offset="100%" stopColor="#090b0e" />
          </radialGradient>
        </defs>
        <rect width={W} height={H} fill="#080d14" />

        {/* Pass 1: machine bodies (below the inter-machine tape) */}
        <Machine phase="body" reels="left"
          x={m1x} y={m1y} w={mw} h={mh}
          isRunning={isRunning} audioLevel={audioLevelDry}
          leftTapeR={42}
        />
        <Machine phase="body" reels="right"
          x={m2x} y={m2y} w={mw} h={mh}
          isRunning={isRunning} audioLevel={audioLevelWet}
          rightTapeR={40}
        />

        {/* Inter-machine tape — right guide post of M1 to left guide post of M2 */}
        <path
          d={`M ${exitX} ${exitY} C ${exitX + 60} ${droopY} ${entryX - 60} ${droopY} ${entryX} ${entryY}`}
          fill="none" stroke="#7a4228" strokeWidth="1.5" opacity="0.85"
        />

        {/* Pass 2: reels */}
        <Machine phase="reels" reels="left"
          x={m1x} y={m1y} w={mw} h={mh}
          isRunning={isRunning} audioLevel={audioLevelDry}
          leftTapeR={42}
        />
        <Machine phase="reels" reels="right"
          x={m2x} y={m2y} w={mw} h={mh}
          isRunning={isRunning} audioLevel={audioLevelWet}
          rightTapeR={40}
        />

      </svg>
    </div>
  )
}
