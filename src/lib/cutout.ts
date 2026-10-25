// Turns an uploaded photo into a cut-out: the subject on a transparent
// background, cropped tight. Runs fully in the browser.

const MAX_INPUT = 1024 // downscale before removal, for speed
const MAX_OUTPUT = 480 // motifs never render larger than this on the tape

function loadImage(src: Blob): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(src)
  const img = new Image()
  img.src = url
  return img
    .decode()
    .then(() => img)
    .finally(() => URL.revokeObjectURL(url))
}

function toCanvas(img: CanvasImageSource, w: number, h: number, max: number) {
  const s = Math.min(1, max / Math.max(w, h))
  const c = document.createElement('canvas')
  c.width = Math.max(1, Math.round(w * s))
  c.height = Math.max(1, Math.round(h * s))
  c.getContext('2d', { willReadFrequently: true })!.drawImage(img, 0, 0, c.width, c.height)
  return c
}

/** True when the image already has a transparent background (e.g. an iPhone "lift subject" PNG). */
function hasTransparency(c: HTMLCanvasElement): boolean {
  const small = toCanvas(c, c.width, c.height, 64)
  const d = small.getContext('2d')!.getImageData(0, 0, small.width, small.height).data
  let clear = 0
  for (let i = 3; i < d.length; i += 4) if (d[i] < 200) clear++
  return clear / (d.length / 4) > 0.03
}

/** Crops to the visible pixels, with a little padding. */
function cropToContent(c: HTMLCanvasElement): HTMLCanvasElement {
  const { width: w, height: h } = c
  const d = c.getContext('2d')!.getImageData(0, 0, w, h).data
  let x0 = w, y0 = h, x1 = -1, y1 = -1
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      if (d[(y * w + x) * 4 + 3] > 24) {
        if (x < x0) x0 = x
        if (x > x1) x1 = x
        if (y < y0) y0 = y
        if (y > y1) y1 = y
      }
  if (x1 < 0) return c
  const pad = Math.round(Math.max(x1 - x0, y1 - y0) * 0.03)
  x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad)
  x1 = Math.min(w - 1, x1 + pad); y1 = Math.min(h - 1, y1 + pad)
  const cw = x1 - x0 + 1, ch = y1 - y0 + 1
  const s = Math.min(1, MAX_OUTPUT / Math.max(cw, ch))
  const out = document.createElement('canvas')
  out.width = Math.round(cw * s)
  out.height = Math.round(ch * s)
  out.getContext('2d', { willReadFrequently: true })!.drawImage(c, x0, y0, cw, ch, 0, 0, out.width, out.height)
  return out
}

export type CutoutResult = { canvas: HTMLCanvasElement; removed: boolean; reason?: string }

export async function cutout(file: File, onProgress?: (label: string) => void): Promise<CutoutResult> {
  const img = await loadImage(file)
  const input = toCanvas(img, img.naturalWidth, img.naturalHeight, MAX_INPUT)

  if (hasTransparency(input)) return { canvas: cropToContent(input), removed: true }

  try {
    onProgress?.('Loading cut-out model…')
    const { removeBackground } = await import('@imgly/background-removal')
    const blob: Blob = await new Promise((res, rej) => input.toBlob((b) => (b ? res(b) : rej(new Error('encode'))), 'image/png'))
    const result = await removeBackground(blob, {
      model: 'isnet_quint8',
      output: { format: 'image/png' },
      progress: (key, current, total) => {
        if (key.startsWith('fetch') && total > 0) {
          onProgress?.(`Downloading cut-out model ${Math.round((current / total) * 100)}% (first time only)`)
        } else if (key.startsWith('compute')) {
          onProgress?.('Cutting out the subject…')
        }
      },
    })
    const cut = await loadImage(result)
    return { canvas: cropToContent(toCanvas(cut, cut.naturalWidth, cut.naturalHeight, MAX_INPUT)), removed: true }
  } catch (err) {
    console.warn('Background removal failed, using the full photo.', err)
    return { canvas: toCanvas(input, input.width, input.height, MAX_OUTPUT), removed: false, reason: String(err) }
  }
}
