// Kraft box mockup in an oblique view. The tape runs from the back edge,
// along the top seam, over the front edge and down the front face.
import { KRAFT } from './palette'
import { TAPE_H } from './tape'

export const BOX_W = 640
export const BOX_H = 470

// geometry in logical units
const FRONT = { x: 100, y: 178, w: 380, h: 252 }
const DX = 110, DY = 80 // depth offset of the top face
const TW = 58 // tape width
const DEP = 120 // tape length on the top face, in tape units
const FR = 150 // tape length down the front
const X0 = 258, Y0 = FRONT.y
const KX = DX / DEP, KY = DY / DEP

/** Tape length (in tape units) the box needs. */
export const TAPE_LENGTH_NEEDED = Math.ceil(((DEP + FR + 20) * TAPE_H) / TW)

function drawTapeRotated(ctx: CanvasRenderingContext2D, tape: HTMLCanvasElement) {
  const s = TW / tape.height
  ctx.save()
  ctx.translate(TW, -DEP)
  ctx.rotate(Math.PI / 2)
  ctx.scale(s, s)
  ctx.drawImage(tape, 0, 0)
  ctx.restore()
}

function gloss(ctx: CanvasRenderingContext2D, y: number, h: number, clear: boolean) {
  const g = ctx.createLinearGradient(0, 0, TW, 0)
  g.addColorStop(0, `rgba(255,255,255,${clear ? 0.3 : 0.22})`)
  g.addColorStop(0.25, 'rgba(255,255,255,0.04)')
  g.addColorStop(0.85, 'rgba(0,0,0,0)')
  g.addColorStop(1, 'rgba(0,0,0,0.1)')
  ctx.fillStyle = g
  ctx.fillRect(0, y, TW, h)
}

/**
 * progress 0..1 animates the tape being applied.
 * label: two short lines printed on the shipping label.
 */
export function drawBox(canvas: HTMLCanvasElement, tape: HTMLCanvasElement, opts: { progress?: number; clear?: boolean; label?: string[]; background?: string }) {
  const { progress = 1, clear = false, label = [], background = '#ECE7DD' } = opts
  const ctx = canvas.getContext('2d')!
  const S = canvas.width / BOX_W
  ctx.setTransform(S, 0, 0, S, 0, 0)
  ctx.fillStyle = background
  ctx.fillRect(0, 0, BOX_W, BOX_H)

  // floor shadow
  ctx.fillStyle = 'rgba(0,0,0,0.13)'
  ctx.beginPath()
  ctx.ellipse(345, 440, 290, 17, 0, 0, Math.PI * 2)
  ctx.fill()

  const { x, y, w, h } = FRONT
  const poly = (pts: number[][], fill: string) => {
    ctx.fillStyle = fill
    ctx.beginPath()
    pts.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)))
    ctx.closePath()
    ctx.fill()
  }
  poly([[x, y], [x + w, y], [x + w + DX, y - DY], [x + DX, y - DY]], '#D8AE74') // top
  poly([[x + w, y], [x + w + DX, y - DY], [x + w + DX, y + h - 100], [x + w, y + h]], '#A97B41') // side
  ctx.fillStyle = KRAFT
  ctx.fillRect(x, y, w, h)

  // corrugation and seams
  ctx.strokeStyle = 'rgba(120,80,30,0.22)'
  ctx.lineWidth = 1
  for (let i = 0; i < 4; i++) {
    const lx = [x + 20, x + 40, x + w - 40, x + w - 20][i]
    ctx.beginPath(); ctx.moveTo(lx, y + 20); ctx.lineTo(lx, y + h - 20); ctx.stroke()
  }
  ctx.strokeStyle = '#B88A4E'; ctx.lineWidth = 2
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y); ctx.stroke()
  ctx.strokeStyle = '#8E6431'
  ctx.beginPath(); ctx.moveTo(X0 + TW / 2, y); ctx.lineTo(X0 + TW / 2 + DX, y - DY); ctx.stroke()

  // shipping label
  ctx.save()
  ctx.translate(x + 26, y + 122)
  ctx.rotate(-0.026)
  ctx.fillStyle = '#FAFAF6'
  ctx.fillRect(0, 0, 118, 80)
  ctx.fillStyle = '#1B1A17'
  ctx.font = '600 8.5px "IBM Plex Mono", monospace'
  ctx.fillText('PEEL · PARCEL', 9, 17)
  ctx.font = '500 7.5px "IBM Plex Mono", monospace'
  label.slice(0, 2).forEach((l, i) => ctx.fillText(l.toUpperCase().slice(0, 24), 9, 31 + i * 11))
  for (let i = 0; i < 23; i++) ctx.fillRect(9 + i * 4.3, 54, [2, 1, 3, 1, 2][i % 5], 18)
  ctx.restore()

  // tape
  const reveal = progress * (DEP + FR + 8)
  const top = Math.min(reveal, DEP)
  const front = Math.max(0, reveal - DEP)

  if (top > 0) {
    ctx.save()
    ctx.transform(1, 0, -KX, KY, X0, Y0)
    ctx.beginPath(); ctx.rect(0, -DEP, TW, top); ctx.clip()
    drawTapeRotated(ctx, tape)
    gloss(ctx, -DEP, DEP, clear)
    ctx.fillStyle = 'rgba(255,255,255,0.07)'
    ctx.fillRect(0, -DEP, TW, DEP)
    ctx.restore()
  }
  if (front > 0) {
    ctx.save()
    ctx.translate(X0, Y0)
    ctx.beginPath(); ctx.rect(0, 0, TW, front); ctx.clip()
    ctx.beginPath()
    ctx.moveTo(0, 0); ctx.lineTo(TW, 0); ctx.lineTo(TW, FR)
    for (let i = 1; i <= 6; i++) ctx.lineTo(TW - (i * TW) / 6, FR + (i % 2 ? 6 : 0))
    ctx.closePath(); ctx.clip()
    drawTapeRotated(ctx, tape)
    gloss(ctx, 0, FR + 8, clear)
    ctx.restore()
    ctx.strokeStyle = 'rgba(0,0,0,0.16)'; ctx.lineWidth = 1.5
    ctx.beginPath(); ctx.moveTo(X0, Y0); ctx.lineTo(X0 + TW, Y0); ctx.stroke()
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0)
}
