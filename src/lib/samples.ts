// Example motifs shown before the user adds photos. They are drawn as grey
// shapes with black detail lines, so they go through the same print
// treatments as a real photo cut-out.

const BODY = '#9A9A9A'
const LINE = '#000'

const SVGS: Record<string, string> = {
  carrot: `<path d="M37 34 Q50 27 63 34 L52 94 Q50 98 48 94 Z" fill="${BODY}"/><path d="M50 32 C44 20 36 14 28 12 C40 11 46 18 50 26 C52 16 56 8 66 4 C61 14 56 22 52 32 Z" fill="${BODY}"/><path d="M42 50 h7 M47 64 h6 M44 78 h5" stroke="${LINE}" stroke-width="2.5" stroke-linecap="round"/>`,
  leaf: `<path d="M50 96 C18 82 10 42 50 6 C90 42 82 82 50 96 Z" fill="${BODY}"/><path d="M50 92 V20 M50 40 L32 30 M50 55 L28 48 M50 70 L32 66 M50 40 L68 30 M50 55 L72 48 M50 70 L68 66" stroke="${LINE}" stroke-width="3" fill="none" stroke-linecap="round"/>`,
  cat: `<path d="M28 96 C24 78 27 62 37 53 C33 45 33 33 37 20 L45 31 C48 30 53 30 56 31 L64 20 C68 33 68 45 63 53 C73 62 76 78 72 96 Z" fill="${BODY}"/><path d="M70 94 C86 95 95 84 90 70 C88 80 81 87 70 88 Z" fill="${BODY}"/><circle cx="44.5" cy="41" r="2.4" fill="${LINE}"/><circle cx="55.5" cy="41" r="2.4" fill="${LINE}"/>`,
  mug: `<path d="M20 34 H68 V80 Q68 94 54 94 H34 Q20 94 20 80 Z" fill="${BODY}"/><path d="M68 44 Q88 44 88 60 Q88 76 68 76 V68 Q80 68 80 60 Q80 52 68 52 Z" fill="${BODY}"/><path d="M34 26 q-5 -7 0 -14 M46 26 q-5 -7 0 -14 M58 26 q-5 -7 0 -14" stroke="${BODY}" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M28 50 V78" stroke="${LINE}" stroke-width="2.5" stroke-linecap="round"/>`,
}

export const SAMPLE_NAMES = Object.keys(SVGS)

export function loadSample(name: string, size = 400): Promise<HTMLCanvasElement> {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${size}" height="${size}">${SVGS[name]}</svg>`
  const img = new Image()
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
  return img.decode().then(() => {
    const c = document.createElement('canvas')
    c.width = c.height = size
    c.getContext('2d', { willReadFrequently: true })!.drawImage(img, 0, 0, size, size)
    return c
  })
}
