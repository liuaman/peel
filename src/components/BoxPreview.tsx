import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import { BOX_H, BOX_W, TAPE_LENGTH_NEEDED, drawBox } from '../lib/box'
import { renderTape, type TapeSpec } from '../lib/tape'

export type BoxPreviewHandle = { replay: () => void; exportCanvas: (scale: number) => HTMLCanvasElement }

type Props = { spec: TapeSpec; ready: boolean; label: string[] }

const SCALE = 2

export const BoxPreview = forwardRef<BoxPreviewHandle, Props>(function BoxPreview({ spec, ready, label }, ref) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const tape = useRef<HTMLCanvasElement | null>(null)
  const raf = useRef(0)
  const played = useRef(false)

  const paint = (progress: number) => {
    if (!canvas.current || !tape.current) return
    drawBox(canvas.current, tape.current, { progress, clear: spec.base === 'clear', label })
  }

  const replay = () => {
    cancelAnimationFrame(raf.current)
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return paint(1)
    const t0 = performance.now()
    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / 1400)
      paint(1 - Math.pow(1 - p, 3))
      if (p < 1) raf.current = requestAnimationFrame(step)
    }
    raf.current = requestAnimationFrame(step)
  }

  useEffect(() => {
    if (!ready) return
    tape.current = renderTape(spec, TAPE_LENGTH_NEEDED, SCALE * 1.2)
    if (!played.current) {
      played.current = true
      replay()
    } else {
      cancelAnimationFrame(raf.current)
      paint(1)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spec, ready, label.join('|')])

  useEffect(() => () => cancelAnimationFrame(raf.current), [])

  useImperativeHandle(ref, () => ({
    replay,
    exportCanvas: (scale: number) => {
      const c = document.createElement('canvas')
      c.width = BOX_W * scale
      c.height = BOX_H * scale
      drawBox(c, renderTape(spec, TAPE_LENGTH_NEEDED, scale * 1.2), { clear: spec.base === 'clear', label })
      return c
    },
  }))

  return (
    <div className="box-preview">
      <canvas ref={canvas} width={BOX_W * SCALE} height={BOX_H * SCALE} role="img" aria-label="Kraft box sealed with your tape" />
      <button type="button" className="ghost-btn replay" onClick={replay}>
        Replay peel
      </button>
    </div>
  )
})
