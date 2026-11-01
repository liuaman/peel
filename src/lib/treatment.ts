// Print treatments: flatten a cut-out into one or two inks so it reads as
// printed tape rather than a pasted photo.
import { rgbOf } from './palette'

export type Treatment = 'silhouette' | 'halftone' | 'riso'

export const TREATMENTS: { id: Treatment; name: string; hint: string }[] = [
  { id: 'silhouette', name: 'Silhouette', hint: 'Solid cut-out. Darkest areas become lines.' },
  { id: 'halftone', name: 'Halftone', hint: 'Dot screen that keeps some shading.' },
  { id: 'riso', name: 'Riso', hint: 'Two inks, slightly off-register.' },
]

const lumAt = (d: Uint8ClampedArray, i: number) => (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) / 255

function blank(w: number, h: number) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return c
}

/** detail 0..1: how much of the dark areas get cut away as lines. */
function silhouette(src: HTMLCanvasElement, fill: string, detail: number): HTMLCanvasElement {
  const { width: w, height: h } = src
  const sd = src.getContext('2d')!.getImageData(0, 0, w, h)
  const d = sd.data
  const [r, g, b] = rgbOf(fill)
  const cut = detail * 0.5
  for (let i = 0; i < d.length; i += 4) {
    const a = d[i + 3]
    const keep = a > 0 && lumAt(d, i) >= cut
    d[i] = r
    d[i + 1] = g
    d[i + 2] = b
    d[i + 3] = keep ? a : 0
  }
  const out = blank(w, h)
  out.getContext('2d')!.putImageData(sd, 0, 0)
  return out
}

/** detail 0..1: higher means a finer dot screen. */
function halftone(src: HTMLCanvasElement, fill: string, detail: number): HTMLCanvasElement {
  const { width: w, height: h } = src
  const d = src.getContext('2d')!.getImageData(0, 0, w, h).data
  const out = blank(w, h)
  const ctx = out.getContext('2d')!
  ctx.fillStyle = fill
  const cell = (16 - detail * 10) * (Math.max(w, h) / 400)
  const ang = Math.PI / 4
  const cos = Math.cos(ang), sin = Math.sin(ang)
  const reach = Math.hypot(w, h)
  for (let v = -reach; v < reach; v += cell) {
    for (let u = -reach; u < reach; u += cell) {
      const x = w / 2 + u * cos - v * sin
      const y = h / 2 + u * sin + v * cos
      if (x < 0 || y < 0 || x >= w || y >= h) continue
      const i = (Math.floor(y) * w + Math.floor(x)) * 4
      const a = d[i + 3] / 255
      if (a < 0.4) continue
      const dark = 1 - lumAt(d, i)
      const r = (cell / 2) * Math.sqrt(Math.min(1, 0.18 + dark * 0.95))
      ctx.beginPath()
      ctx.arc(x, y, r, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  return out
}

function riso(src: HTMLCanvasElement, fill: string, alt: string, detail: number): HTMLCanvasElement {
  const { width: w, height: h } = src
  const ox = Math.round(w * 0.035), oy = Math.round(h * 0.025)
  const out = blank(w + ox, h + oy)
  const ctx = out.getContext('2d')!
  ctx.drawImage(silhouette(src, alt, 0), ox, oy)
  ctx.drawImage(halftone(src, fill, detail), 0, 0)
  return out
}

const cache = new WeakMap<HTMLCanvasElement, Map<string, HTMLCanvasElement>>()

/** Cached: re-rendering the tape on every keystroke stays cheap. */
export function renderMotif(src: HTMLCanvasElement, t: Treatment, fill: string, alt: string, detail: number): HTMLCanvasElement {
  let m = cache.get(src)
  if (!m) cache.set(src, (m = new Map()))
  const key = `${t}|${fill}|${alt}|${detail.toFixed(2)}`
  let c = m.get(key)
  if (!c) {
    c = t === 'silhouette' ? silhouette(src, fill, detail) : t === 'halftone' ? halftone(src, fill, detail) : riso(src, fill, alt, detail)
    m.set(key, c)
  }
  return c
}
