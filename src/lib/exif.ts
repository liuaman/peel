import exifr from 'exifr'

export type PhotoMeta = { date?: string; place?: string }

const pad = (n: number) => String(n).padStart(2, '0')

/** Reads when and where a photo was taken. Place lookup is best-effort. */
export async function readPhotoMeta(file: File): Promise<PhotoMeta> {
  const meta: PhotoMeta = {}
  try {
    const data = await exifr.parse(file, { gps: true, pick: ['DateTimeOriginal', 'CreateDate', 'latitude', 'longitude'] })
    const d: unknown = data?.DateTimeOriginal ?? data?.CreateDate
    if (d instanceof Date && !isNaN(d.getTime())) meta.date = `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`
    if (typeof data?.latitude === 'number' && typeof data?.longitude === 'number') {
      meta.place = await reverseGeocode(data.latitude, data.longitude)
    }
  } catch {
    // no metadata, that's fine
  }
  return meta
}

async function reverseGeocode(lat: number, lon: number): Promise<string | undefined> {
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 5000)
    const res = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`,
      { signal: ctrl.signal },
    )
    clearTimeout(t)
    if (!res.ok) return undefined
    const j = await res.json()
    return j.city || j.locality || j.principalSubdivision || undefined
  } catch {
    return undefined
  }
}
