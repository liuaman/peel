export type Palette = { ink1: string; ink2: string }
export type Locks = { ink1: boolean; ink2: boolean }

export const PAPER = '#FAFAF6'
export const KRAFT = '#C99A5B'

/** Hand-picked two-ink sets. The first one is the default. */
export const PRESETS: { name: string; palette: Palette }[] = [
  { name: 'Courier', palette: { ink1: '#1F5FAF', ink2: '#D8432E' } },
  { name: 'Pineapple', palette: { ink1: '#2E5E3E', ink2: '#E2457A' } },
  { name: 'Persimmon', palette: { ink1: '#1E6B6B', ink2: '#E2702A' } },
  { name: 'Postal', palette: { ink1: '#1D3557', ink2: '#E63946' } },
  { name: 'Riso', palette: { ink1: '#0078BF', ink2: '#FF48B0' } },
  { name: 'Matcha', palette: { ink1: '#2B2B2B', ink2: '#5B8A3A' } },
]

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

export function rgbOf(hex: string) {
  return hexToRgb(hex)
}

function hslToHex(h: number, s: number, l: number): string {
  h = ((h % 360) + 360) % 360
  s /= 100
  l /= 100
  const k = (n: number) => (n + h / 30) % 12
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
  const to = (x: number) => Math.round(x * 255).toString(16).padStart(2, '0')
  return `#${to(f(0))}${to(f(8))}${to(f(4))}`.toUpperCase()
}

function hueOf(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((v) => v / 255)
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const d = max - min
  if (d === 0) return 0
  let h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4
  h *= 60
  return h < 0 ? h + 360 : h
}

function relLum(hex: string): number {
  const c = hexToRgb(hex).map((v) => {
    const x = v / 255
    return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
}

export function contrast(a: string, b: string): number {
  const [x, y] = [relLum(a), relLum(b)].sort((m, n) => n - m)
  return (x + 0.05) / (y + 0.05)
}

/** Hue offsets that give two inks a clear relationship. */
const OFFSETS = [180, 165, 195, 150, 210, 120, 240]

const rand = (min: number, max: number) => min + Math.random() * (max - min)

/** An ink dark and saturated enough that white text on it stays readable. */
function randomInk(hue: number): string {
  const s = rand(55, 82)
  let l = rand(34, 52)
  let hex = hslToHex(hue, s, l)
  while (contrast(hex, PAPER) < 3.2 && l > 18) {
    l -= 3
    hex = hslToHex(hue, s, l)
  }
  return hex
}

/** Coolors-style shuffle: keeps locked inks, regenerates the rest. */
export function shuffle(current: Palette, locks: Locks): Palette {
  if (locks.ink1 && locks.ink2) return current
  const offset = OFFSETS[Math.floor(Math.random() * OFFSETS.length)]
  if (locks.ink1) return { ink1: current.ink1, ink2: randomInk(hueOf(current.ink1) + offset) }
  if (locks.ink2) return { ink1: randomInk(hueOf(current.ink2) - offset), ink2: current.ink2 }
  const h = rand(0, 360)
  return { ink1: randomInk(h), ink2: randomInk(h + offset) }
}
