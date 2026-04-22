import { useRef, useEffect } from 'react'

const MODES = [
  { fn: (ndx, ndy) => ndx * ndy * 20 },
  { fn: (ndx, ndy) => (Math.abs(ndx) + Math.abs(ndy)) * 18 },
  { fn: (ndx, ndy) => (ndx * ndx - ndy * ndy) * 18 },
  { fn: (ndx, ndy) => Math.atan2(ndy, ndx) * 8 / Math.PI + Math.sqrt(ndx * ndx + ndy * ndy) * 16 },
]

function hexToABGR(hex) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return ((0xFF << 24) | (b << 16) | (g << 8) | r) >>> 0
}

export function OpArtCanvas({ className, style, mode = 0, audioLevelRef, color1 = '#000000', color2 = '#ffffff' }) {
  const canvasRef = useRef(null)
  const animRef   = useRef(null)
  const stateRef  = useRef({ t: 0, W: 0, H: 0, buf32: null, imgData: null, smoothedAudio: 0 })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const s = stateRef.current
    const SCALE = 0.5
    const WHITE = hexToABGR(color2)
    const BLACK = hexToABGR(color1)

    function resize() {
      const W = Math.ceil(canvas.offsetWidth  * SCALE)
      const H = Math.ceil(canvas.offsetHeight * SCALE)
      if (!W || !H) return
      canvas.width  = W
      canvas.height = H
      s.W = W; s.H = H
      s.imgData = ctx.createImageData(W, H)
      s.buf32   = new Uint32Array(s.imgData.data.buffer)
    }

    const ro = new ResizeObserver(resize)
    ro.observe(canvas)
    resize()

    const fn = MODES[mode % MODES.length].fn

    function draw() {
      const { W, H, buf32, imgData } = s
      if (W && H && buf32) {
        s.t += 0.016
        const t     = s.t
        const phase = t * 0.7
        const cx = W / 2, cy = H / 2

        // Distortion center drifts on a Lissajous path around the face
        const driftX = cx + Math.sin(t * 0.31)              * W * 0.28
        const driftY = cy + Math.sin(t * 0.23 + Math.PI / 2) * H * 0.32

        const audioLevel = audioLevelRef ? audioLevelRef.current : 0
        s.smoothedAudio = s.smoothedAudio * 0.992 + audioLevel * 0.008
        const distAmp = s.smoothedAudio * 9.0
        const sigma2  = (Math.min(W, H) * 0.4) ** 2
        const hasAudio = distAmp > 0.01

        for (let y = 0; y < H; y++) {
          const ndy = (y - cy) / cy
          const mdy = y - driftY
          const mdy2 = mdy * mdy
          const row = y * W
          for (let x = 0; x < W; x++) {
            const ndx = (x - cx) / cx
            let f = fn(ndx, ndy) + phase

            if (hasAudio) {
              const mdx   = x - driftX
              const dist2 = mdx * mdx + mdy2
              if (dist2 < sigma2 * 9) {
                f += distAmp * Math.exp(-dist2 / sigma2)
              }
            }

            buf32[row + x] = Math.floor(f) & 1 ? BLACK : WHITE
          }
        }
        ctx.putImageData(imgData, 0, 0)
      }
      animRef.current = requestAnimationFrame(draw)
    }

    draw()

    return () => {
      cancelAnimationFrame(animRef.current)
      ro.disconnect()
    }
  }, [mode])

  return <canvas ref={canvasRef} className={className} style={style} />
}
