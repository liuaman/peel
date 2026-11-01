// Draws a tape design onto a canvas. The tape is a repeating strip:
// x runs along the roll, y across it (0..TAPE_H).
import { PAPER, type Palette } from './palette'
import { renderMotif, type Treatment } from './treatment'

export type Layout = 'pattern' | 'message' | 'both'
export type TapeBase = 'white' | 'clear'

export const LAYOUTS: { id: Layout; name: string; hint: string }[] = [
  { id: 'pattern', name: 'Pattern', hint: 'Your photos repeat like a washi roll.' },
  { id: 'message', name: 'Message', hint: 'One line, set big.' },
  { id: 'both', name: 'Both', hint: 'Message block plus photo block.' },
]

export interface TapeSpec {
  layout: Layout
  treatment: Treatment
  palette: Palette
  base: TapeBase
  message: string
  details: string
  detail: number
  motifs: HTMLCanvasElement[]
}

export const TAPE_H = 120
const H = TAPE_H
const DISPLAY = '"Barlow Condensed", "Arial Narrow", sans-serif'
const MONO = '"IBM Plex Mono", ui-monospace, monospace'

type Ctx = CanvasRenderingContext2D

function drawMotif(ctx: Ctx, img: HTMLCanvasElement, cx: number, cy: number, maxW: number, maxH: number, rot = 0) {
  const s = Math.min(maxW / img.width, maxH / img.height)
  ctx.save()
  ctx.translate(cx, cy)
  ctx.rotate((rot * Math.PI) / 180)
  ctx.drawImage(img, (-img.width * s) / 2, (-img.height * s) / 2, img.width * s, img.height * s)
  ctx.restore()
}

/** Splits "A · B · C" into at most two lines for the small mono text. */
function detailLines(details: string): string[] {
  const parts = details.split(/\s*[·|/]\s*/).filter(Boolean)
  if (parts.length <= 1) return parts.length ? [parts[0]] : []
  const mid = Math.ceil(parts.length / 2)
  return [parts.slice(0, mid).join(' · '), parts.slice(mid).join(' · ')]
}

/** Splits a message into one or two balanced lines. */
function wrapMessage(ctx: Ctx, text: string, maxW: number): string[] {
  const words = text.split(/\s+/).filter(Boolean)
  if (words.length < 2 || ctx.measureText(text).width <= maxW) return [text]
  let best = [text], bestW = Infinity
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(' '), b = words.slice(i).join(' ')
    const w = Math.max(ctx.measureText(a).width, ctx.measureText(b).width)
    if (w < bestW) { bestW = w; best = [a, b] }
  }
  return best
}

function atLeast<T>(arr: T[], n: number): T[] {
  if (!arr.length) return []
  const out: T[] = []
  while (out.length < Math.max(n, arr.length)) out.push(arr[out.length % arr.length])
  return out
}

function monoBlock(ctx: Ctx, lines: string[], x: number, cy: number, color: string, size = H * 0.115) {
  ctx.font = `500 ${size}px ${MONO}`
  ctx.fillStyle = color
  ctx.textBaseline = 'middle'
  const lh = size * 1.35
  const top = cy - ((lines.length - 1) * lh) / 2
  lines.forEach((l, i) => ctx.fillText(l.toUpperCase(), x, top + i * lh))
  ctx.textBaseline = 'alphabetic'
  return Math.max(0, ...lines.map((l) => ctx.measureText(l.toUpperCase()).width))
}

function measureMono(ctx: Ctx, lines: string[], size = H * 0.115) {
  ctx.font = `500 ${size}px ${MONO}`
  return Math.max(0, ...lines.map((l) => ctx.measureText(l.toUpperCase()).width))
}

/* ---------- layouts: each draws one repeat unit at x and returns its width ---------- */

function patternUnit(ctx: Ctx, s: TapeSpec, x: number, draw: boolean): number {
  const { ink1, ink2 } = s.palette
  const list = atLeast(s.motifs, 4)
  const slot = H * 0.74, gap = H * 0.16, pad = H * 0.16
  const lines = detailLines(s.details)
  const textW = lines.length ? H * 0.14 + measureMono(ctx, lines) + H * 0.1 : 0
  const w = pad + list.length * (slot + gap) + textW + pad
  if (!draw) return w
  if (s.base === 'white') { ctx.fillStyle = PAPER; ctx.fillRect(x, 0, w, H) }
  ctx.fillStyle = ink1
  ctx.fillRect(x, H * 0.07, w, 2)
  ctx.fillRect(x, H * 0.93 - 2, w, 2)
  list.forEach((m, i) => {
    const fill = i % 2 ? ink2 : ink1
    const alt = i % 2 ? ink1 : ink2
    drawMotif(ctx, renderMotif(m, s.treatment, fill, alt, s.detail), x + pad + i * (slot + gap) + slot / 2, H / 2, slot, H * 0.7, i % 2 ? 7 : -6)
  })
  if (lines.length) {
    const tx = x + pad + list.length * (slot + gap)
    ctx.fillStyle = ink2
    ctx.beginPath(); ctx.arc(tx + H * 0.03, H / 2, H * 0.035, 0, Math.PI * 2); ctx.fill()
    monoBlock(ctx, lines, tx + H * 0.14, H / 2, ink1)
  }
  return w
}

function messageUnit(ctx: Ctx, s: TapeSpec, x: number, draw: boolean): number {
  const { ink1, ink2 } = s.palette
  const text = (s.message || ' ').toUpperCase()
  const size = H * 0.56
  ctx.font = `800 ${size}px ${DISPLAY}`
  const tw = ctx.measureText(text).width
  const lines = detailLines(s.details)
  const pad = H * 0.22, arrow = H * 0.34, slot = H * 0.78
  const hasMotif = s.motifs.length > 0
  const mw = lines.length ? measureMono(ctx, lines) : 0
  const w = pad + tw + H * 0.24 + arrow + (hasMotif ? H * 0.16 + slot : 0) + (mw ? H * 0.24 + mw : 0) + pad
  if (!draw) return w
  ctx.fillStyle = ink1
  ctx.fillRect(x, 0, w, H)
  ctx.font = `800 ${size}px ${DISPLAY}`
  ctx.fillStyle = PAPER
  ctx.fillText(text, x + pad, H / 2 + size * 0.35)
  let cx = x + pad + tw + H * 0.24
  ctx.strokeStyle = PAPER
  ctx.lineWidth = H * 0.045
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.beginPath()
  ctx.moveTo(cx, H / 2); ctx.lineTo(cx + arrow, H / 2)
  ctx.moveTo(cx + arrow * 0.62, H / 2 - arrow * 0.32); ctx.lineTo(cx + arrow, H / 2); ctx.lineTo(cx + arrow * 0.62, H / 2 + arrow * 0.32)
  ctx.stroke()
  cx += arrow
  if (hasMotif) {
    cx += H * 0.16
    drawMotif(ctx, renderMotif(s.motifs[0], s.treatment, PAPER, ink2, s.detail), cx + slot / 2, H / 2, slot, H * 0.74)
    cx += slot
  }
  if (mw) monoBlock(ctx, lines, cx + H * 0.24, H / 2, PAPER)
  ctx.setLineDash([H * 0.05, H * 0.05])
  ctx.lineWidth = 1.5
  ctx.beginPath(); ctx.moveTo(x + w - 1, H * 0.08); ctx.lineTo(x + w - 1, H * 0.92); ctx.stroke()
  ctx.setLineDash([])
  return w
}

function bothUnit(ctx: Ctx, s: TapeSpec, x: number, draw: boolean): number {
  const { ink1, ink2 } = s.palette
  const text = (s.message || ' ').toUpperCase()
  ctx.font = `800 ${H * 0.4}px ${DISPLAY}`
  const lines = wrapMessage(ctx, text, H * 2.2)
  const size = lines.length > 1 ? H * 0.4 : H * 0.5
  ctx.font = `800 ${size}px ${DISPLAY}`
  const tw = Math.max(...lines.map((l) => ctx.measureText(l).width))
  const pad = H * 0.2
  const aW = pad + tw + pad

  const tag = (s.details.split(/\s*[·|/]\s*/)[0] || '').toUpperCase()
  const tagSize = H * 0.105
  const tagW = tag ? measureMono(ctx, [tag], tagSize) + H * 0.14 : 0
  const list = atLeast(s.motifs, 3).slice(0, Math.max(3, s.motifs.length))
  const slot = H * 0.66
  const bW = Math.max(tagW + pad * 2, pad + list.length * slot + (list.length - 1) * H * 0.06 + pad)
  const w = aW + bW
  if (!draw) return w

  ctx.fillStyle = ink1
  ctx.fillRect(x, 0, aW, H)
  ctx.fillStyle = PAPER
  ctx.font = `800 ${size}px ${DISPLAY}`
  if (lines.length > 1) {
    ctx.fillText(lines[0], x + pad, H * 0.45)
    ctx.fillText(lines[1], x + pad, H * 0.84)
  } else {
    ctx.fillText(lines[0], x + pad, H / 2 + size * 0.35)
  }

  const bx = x + aW
  ctx.fillStyle = ink2
  ctx.fillRect(bx, 0, bW, H)
  if (tag) {
    ctx.fillStyle = PAPER
    ctx.fillRect(bx + pad * 0.6, H * 0.1, tagW, H * 0.22)
    monoBlock(ctx, [tag], bx + pad * 0.6 + H * 0.07, H * 0.21, ink2, tagSize)
  }
  list.forEach((m, i) => {
    const cx = bx + pad + i * (slot + H * 0.06) + slot / 2
    const top = tag ? H * 0.36 : H * 0.12
    drawMotif(ctx, renderMotif(m, s.treatment, PAPER, ink1, s.detail), cx, (top + H * 0.94) / 2, slot, H * 0.94 - top, i % 2 ? 10 : -8)
  })
  return w
}

const UNITS = { pattern: patternUnit, message: messageUnit, both: bothUnit }

export function unitWidth(s: TapeSpec): number {
  const ctx = document.createElement('canvas').getContext('2d')!
  return UNITS[s.layout](ctx, s, 0, false)
}

/** The tape as a straight rectangle, `length` long, at `scale` px per unit. */
export function renderTape(s: TapeSpec, length: number, scale = 1): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = Math.ceil(length * scale)
  c.height = Math.ceil(H * scale)
  const ctx = c.getContext('2d')!
  ctx.scale(scale, scale)
  const unit = UNITS[s.layout]
  let x = 0, guard = 0
  while (x < length && guard++ < 200) x += unit(ctx, s, x, true)
  return c
}

/** A loose strip with torn ends, for previews and PNG export. */
export function renderStrip(s: TapeSpec, length: number, scale = 1): HTMLCanvasElement {
  const tape = renderTape(s, length, scale)
  const c = document.createElement('canvas')
  c.width = tape.width
  c.height = tape.height
  const ctx = c.getContext('2d')!
  const tooth = 6 * scale, step = c.height / 8
  ctx.beginPath()
  ctx.moveTo(tooth, 0)
  ctx.lineTo(c.width - tooth, 0)
  for (let i = 1; i <= 8; i++) ctx.lineTo(c.width - (i % 2 ? 0 : tooth), i * step)
  ctx.lineTo(tooth, c.height)
  for (let i = 7; i >= 0; i--) ctx.lineTo(i % 2 ? 0 : tooth, i * step)
  ctx.closePath()
  ctx.save()
  ctx.clip()
  if (s.base === 'clear') {
    ctx.fillStyle = 'rgba(255,255,255,0.18)'
    ctx.fillRect(0, 0, c.width, c.height)
  }
  ctx.drawImage(tape, 0, 0)
  const g = ctx.createLinearGradient(0, 0, 0, c.height)
  g.addColorStop(0, 'rgba(255,255,255,0.22)')
  g.addColorStop(0.2, 'rgba(255,255,255,0.03)')
  g.addColorStop(1, 'rgba(0,0,0,0.06)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, c.width, c.height)
  ctx.restore()
  return c
}
