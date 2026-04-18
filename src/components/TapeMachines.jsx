import './TapeMachines.css'

const REEL_R     = 52
const HUB_R      = 20
const HUB_HOLE_R = 7
// Spokes span from hub edge to rim inner edge.
// The windows (80° gaps between spokes) are simply empty — tape shows through.
const WIN_OUT = REEL_R - 6   // = 46  spoke outer / rim inner edge
const WIN_IN  = HUB_R        // = 20  spoke inner / hub outer edge

// Annular sector path (r1=inner, r2=outer, angles in degrees)
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

// 3 spokes: 40° wide at 0°/120°/240°. Windows (80° gaps) are open — no path needed.
const SPOKE_PATHS = [0, 120, 240].map(a => makeSector(WIN_IN, WIN_OUT, a - 20, a + 20))

function Reel({ cx, cy, tapeR = 30, ccw = false, isRunning }) {
  return (
    <g transform={`translate(${cx}, ${cy})`}>
      {/* Wound tape */}
      <circle r={tapeR} fill="#7a3c1e" />
      <circle r={tapeR} fill="none" stroke="#a85030" strokeWidth="1.5" opacity="0.5" />

      <g className={`reel ${isRunning ? 'reel--spinning' : ''} ${ccw ? 'reel--ccw' : ''}`}>

        {/* 3 aluminum spokes (windows are simply the gaps between them) */}
        {SPOKE_PATHS.map((d, i) => (
          <path key={i} d={d} fill="url(#reel-plate-grad)" />
        ))}

        {/* Rim ring: stroke centered at WIN_OUT+3 spans exactly WIN_OUT→REEL_R */}
        <circle r={WIN_OUT + 3} fill="none" stroke="#b4bac2" strokeWidth={REEL_R - WIN_OUT} />
        {/* Rim outer highlight */}
        <circle r={REEL_R}      fill="none" stroke="#d0d5dc" strokeWidth="1"   opacity="0.7" />
        {/* Rim inner shadow */}
        <circle r={WIN_OUT}     fill="none" stroke="#505864" strokeWidth="0.8" opacity="0.6" />

        {/* Hub */}
        <circle r={HUB_R} fill="url(#reel-hub-grad)" />
        <circle r={HUB_R} fill="none" stroke="#2c3040" strokeWidth="1.5" />
        <circle r={HUB_R - 5} fill="none" stroke="#1c2030" strokeWidth="1" opacity="0.55" />

        {/* Spindle hole */}
        <circle r={HUB_HOLE_R} fill="#050608" />
        <circle r={HUB_HOLE_R * 0.5} fill="#0a0c12" />

      </g>
    </g>
  )
}

// phase: 'body' = everything except reels, 'reels' = reels only, default = all
// reels: 'both' | 'left' | 'right' — which reels are physically present
function Machine({ x, y, w = 270, h = 185, isRunning, leftTapeR = 32, rightTapeR = 26, audioLevel = 0, label, phase, reels = 'both' }) {
  const lx = x + 74          // left reel cx
  const ly = y + 96          // left reel cy
  const rx = x + w - 74      // right reel cx
  const ry = y + 93          // right reel cy
  const hx = x + w / 2      // head center x
  const hy = y + 170         // head y (below reels)

  const showBody  = !phase || phase === 'body'
  const showReels = !phase || phase === 'reels'

  return (
    <g>
      {showBody && <>
        {/* Body */}
        <rect x={x} y={y} width={w} height={h} rx="8" fill="#1c2a42" />
        <rect x={x + 2} y={y + 2} width={w - 4} height={38} rx="6" fill="#263858" opacity="0.5" />
        <rect x={x + 1} y={y + 1} width={w - 2} height={h - 2} rx="7" fill="none" stroke="#2a3e5a" strokeWidth="1" />

        {/* Top control strip */}
        <g>
          <defs>
            <linearGradient id={`rainbow-${x}-${y}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#d73a3a" />
              <stop offset="20%" stopColor="#d73a3a" />
              <stop offset="20%" stopColor="#f49b2a" />
              <stop offset="40%" stopColor="#f49b2a" />
              <stop offset="40%" stopColor="#43d855" />
              <stop offset="60%" stopColor="#43d855" />
              <stop offset="60%" stopColor="#3b8de8" />
              <stop offset="80%" stopColor="#3b8de8" />
              <stop offset="80%" stopColor="#9a4de8" />
              <stop offset="100%" stopColor="#9a4de8" />
            </linearGradient>
          </defs>
          <rect x={x + 12} y={y + 8} width={w - 24} height={20} rx="6" fill={`url(#rainbow-${x}-${y})`} opacity="1" />
          <rect x={x + 12} y={y + 8} width={w - 24} height={20} rx="6" fill="#111c2e" opacity="0.56" />
          <circle cx={x + 22} cy={y + 18} r="4" fill={isRunning ? '#37c957' : '#d73a3a'} stroke="#2a3e5a" strokeWidth="1" />
          <circle cx={x + 58} cy={y + 18} r="10" fill="#c8ced4" stroke="#2a3e5a" strokeWidth="2" />
          <circle cx={x + 58} cy={y + 18} r="4" fill="#1d2431" />
          <rect x={x + 142} y={y + 12} width="8" height="12" rx="3" fill="#0f1a2f" stroke="#2a3e5a" strokeWidth="1" />
          <rect x={x + 154} y={y + 12} width="8" height="12" rx="3" fill="#0f1a2f" stroke="#2a3e5a" strokeWidth="1" />
          <rect x={x + w - 110} y={y + 9} width="72" height="18" rx="4" fill="#101826" stroke="#2a3e5a" strokeWidth="1" />
          <rect x={x + w - 106} y={y + 11} width="64" height="14" rx="3" fill="#15203f" />
          {Array.from({ length: 14 }, (_, i) => {
            const threshold = (i + 1) / 14
            const isLit = audioLevel >= threshold
            const fill = i < 4 ? '#d73a3a' : i < 8 ? '#f4b642' : '#43d855'
            return (
              <rect
                key={`led-${i}`}
                x={x + w - 104 + i * 4.5}
                y={y + 12}
                width="3"
                height="10"
                rx="1"
                fill={isLit ? fill : '#1a2534'}
                opacity={isLit ? 1 : 0.35}
              />
            )
          })}
          <line x1={x + w - 92} y1={y + 14} x2={x + w - 92} y2={y + 20} stroke="#4a5c7f" strokeWidth="1" />
          <line x1={x + w - 72} y1={y + 14} x2={x + w - 72} y2={y + 20} stroke="#4a5c7f" strokeWidth="1" />
          <line x1={x + w - 52} y1={y + 14} x2={x + w - 52} y2={y + 20} stroke="#4a5c7f" strokeWidth="1" />
          <circle cx={x + w - 18} cy={y + 18} r="5" fill="#1c2a42" stroke="#2a3e5a" strokeWidth="1.5" />
          <circle cx={x + w - 18} cy={y + 18} r="2.5" fill="#3c556f" />
        </g>

        {/* Tape path — left reel → left guide → across heads → right guide → right reel.
            Only draw segments for reels that are physically present. */}
        {(() => {
          // Left reel (supply): tape exits lower-left (106° = mirror of 74°)
          const lEx = lx - Math.round(leftTapeR  * 0.276)
          const lEy = ly + Math.round(leftTapeR  * 0.961)
          // Right reel (take-up): tape enters lower-right (74°)
          const rEx = rx + Math.round(rightTapeR * 0.276)
          const rEy = ry + Math.round(rightTapeR * 0.961)
          return <>
            {(reels === 'both' || reels === 'left') && <>
              <path d={`M ${lEx} ${lEy} C ${lx - 8} ${ly + 62} ${hx - 80} ${hy - 6} ${hx - 78} ${hy + 4}`}
                fill="none" stroke="#7a4228" strokeWidth="3.5" opacity="0.9" />
              <path d={`M ${lEx} ${lEy - 2} C ${lx - 8} ${ly + 60} ${hx - 80} ${hy - 8} ${hx - 78} ${hy + 2}`}
                fill="none" stroke="#c06030" strokeWidth="1" opacity="0.35" />
            </>}
            <line x1={hx - 78} y1={hy + 4} x2={hx + 78} y2={hy + 4} stroke="#7a4228" strokeWidth="3.5" opacity="0.9" />
            <line x1={hx - 78} y1={hy + 2} x2={hx + 78} y2={hy + 2} stroke="#c06030" strokeWidth="1" opacity="0.35" />
            {(reels === 'both' || reels === 'right') && <>
              <path d={`M ${hx + 78} ${hy + 4} C ${hx + 80} ${hy - 6} ${rx + 8} ${ry + 62} ${rEx} ${rEy}`}
                fill="none" stroke="#7a4228" strokeWidth="3.5" opacity="0.9" />
              <path d={`M ${hx + 78} ${hy + 2} C ${hx + 80} ${hy - 8} ${rx + 8} ${ry + 60} ${rEx} ${rEy - 2}`}
                fill="none" stroke="#c06030" strokeWidth="1" opacity="0.35" />
            </>}
          </>
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
        <rect x={hx - 30} y={hy - 16} width={60} height={36} rx="2" fill="#090e14" />

        {/* Shared mounting base plate */}
        <rect x={hx - 28} y={hy + 18} width={56} height={5} rx="1.5" fill="#1a2430" stroke="#243040" strokeWidth="0.75" />

        {/* ── Erase head (leftmost) ── */}
        <rect x={hx - 24} y={hy - 13} width={11} height={29} rx="1.5" fill="#1c2a3a" />
        <rect x={hx - 23} y={hy - 12} width={9}  height={27} rx="1"   fill="none" stroke="#2c3e52" strokeWidth="0.75" />
        <line x1={hx - 23} y1={hy + 3} x2={hx - 14} y2={hy + 3} stroke="#3e4e62" strokeWidth="1.5" />
        <line x1={hx - 23} y1={hy + 3} x2={hx - 14} y2={hy + 3} stroke="#7888a0" strokeWidth="0.6" opacity="0.7" />

        {/* ── Record head (center) — taller, amber gap ── */}
        <rect x={hx - 6}  y={hy - 15} width={12} height={33} rx="1.5" fill="#202e40" />
        <rect x={hx - 5}  y={hy - 14} width={10} height={31} rx="1"   fill="none" stroke="#304252" strokeWidth="0.75" />
        <line x1={hx - 5} y1={hy + 3}  x2={hx + 5} y2={hy + 3}  stroke="#b87820" strokeWidth="1.5" />
        <line x1={hx - 5} y1={hy + 3}  x2={hx + 5} y2={hy + 3}  stroke="#ffbe50" strokeWidth="0.7" opacity="0.85" />

        {/* ── Playback head (rightmost) ── */}
        <rect x={hx + 13} y={hy - 13} width={11} height={29} rx="1.5" fill="#1c2a3a" />
        <rect x={hx + 14} y={hy - 12} width={9}  height={27} rx="1"   fill="none" stroke="#2c3e52" strokeWidth="0.75" />
        <line x1={hx + 14} y1={hy + 3} x2={hx + 23} y2={hy + 3} stroke="#3e4e62" strokeWidth="1.5" />
        <line x1={hx + 14} y1={hy + 3} x2={hx + 23} y2={hy + 3} stroke="#7888a0" strokeWidth="0.6" opacity="0.7" />

        {/* Level knobs */}
        <circle cx={x + w - 37} cy={y + h - 22} r="8" fill="#1e2e42" stroke="#2e3e58" strokeWidth="1.5" />
        <circle cx={x + w - 37} cy={y + h - 22} r="2.5" fill="#3e5068" />
        <line x1={x + w - 37} y1={y + h - 22} x2={x + w - 37} y2={y + h - 28} stroke="#8090b0" strokeWidth="1.5" />
        <circle cx={x + w - 17} cy={y + h - 22} r="8" fill="#1e2e42" stroke="#2e3e58" strokeWidth="1.5" />
        <circle cx={x + w - 17} cy={y + h - 22} r="2.5" fill="#3e5068" />
        <line x1={x + w - 17} y1={y + h - 22} x2={x + w - 21} y2={y + h - 27} stroke="#8090b0" strokeWidth="1.5" />

        {/* Label */}
        <text x={x + 10} y={y + h - 10} fontSize="7" fill="#3a5070" fontFamily="monospace" letterSpacing="2">
          {label}
        </text>
      </>}

      {showReels && <>
        {(reels === 'both' || reels === 'left') && (
          <Reel cx={lx} cy={ly} tapeR={leftTapeR}  ccw={true}  isRunning={isRunning} />
        )}
        {(reels === 'both' || reels === 'right') && (
          <Reel cx={rx} cy={ry} tapeR={rightTapeR} ccw={false} isRunning={isRunning} />
        )}
      </>}

    </g>
  )
}

export function TapeMachines({ isRunning, audioLevel }) {
  const W = 720, H = 260
  const m1x = 10,  m1y = 22, mw = 268, mh = 215
  const m2x = 442, m2y = 22

  // Inter-machine tape: exits M1's right guide post, enters M2's left guide post.
  // Both guide posts are at hx±38, hy+4 — same height, so tape is nearly horizontal.
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
          isRunning={isRunning} audioLevel={audioLevel}
          leftTapeR={42} label="REVOX B77 · REC"
        />
        <Machine phase="body" reels="right"
          x={m2x} y={m2y} w={mw} h={mh}
          isRunning={isRunning} audioLevel={audioLevel}
          rightTapeR={40} label="REVOX B77 · PLAY"
        />

        {/* Inter-machine tape — right guide post of M1 to left guide post of M2 */}
        <path
          d={`M ${exitX} ${exitY} C ${exitX + 60} ${droopY} ${entryX - 60} ${droopY} ${entryX} ${entryY}`}
          fill="none" stroke="#7a4228" strokeWidth="3.5" opacity="0.85"
        />
        <path
          d={`M ${exitX} ${exitY - 2} C ${exitX + 60} ${droopY - 2} ${entryX - 60} ${droopY - 2} ${entryX} ${entryY - 2}`}
          fill="none" stroke="#a86040" strokeWidth="1" opacity="0.4"
        />

        {/* Pass 2: reels */}
        <Machine phase="reels" reels="left"
          x={m1x} y={m1y} w={mw} h={mh}
          isRunning={isRunning} audioLevel={audioLevel}
          leftTapeR={42} label="REVOX B77 · REC"
        />
        <Machine phase="reels" reels="right"
          x={m2x} y={m2y} w={mw} h={mh}
          isRunning={isRunning} audioLevel={audioLevel}
          rightTapeR={40} label="REVOX B77 · PLAY"
        />

      </svg>
    </div>
  )
}
