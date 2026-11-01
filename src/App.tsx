import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { BoxPreview, type BoxPreviewHandle } from './components/BoxPreview'
import { ColorControls } from './components/ColorControls'
import { cutout } from './lib/cutout'
import { downloadCanvas } from './lib/download'
import { readPhotoMeta } from './lib/exif'
import { PRESETS, shuffle, type Locks, type Palette } from './lib/palette'
import { SAMPLE_NAMES, loadSample } from './lib/samples'
import { LAYOUTS, renderStrip, type Layout, type TapeBase, type TapeSpec } from './lib/tape'
import { TREATMENTS, type Treatment } from './lib/treatment'

type Motif = {
  id: string
  name: string
  kind: 'sample' | 'photo'
  status: 'working' | 'ready'
  canvas?: HTMLCanvasElement
  thumb?: string
  note?: string
}

const MAX_PHOTOS = 6
let nextId = 0

function Segmented<T extends string>({ options, value, onChange, label }: { options: { id: T; name: string }[]; value: T; onChange: (v: T) => void; label: string }) {
  return (
    <div className="segmented" role="group" aria-label={label}>
      {options.map((o) => (
        <button type="button" key={o.id} aria-pressed={o.id === value} onClick={() => onChange(o.id)}>
          {o.name}
        </button>
      ))}
    </div>
  )
}

function StripPreview({ spec, ready }: { spec: TapeSpec; ready: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!ready || !ref.current) return
    const c = renderStrip(spec, 1400, 2)
    c.setAttribute('role', 'img')
    c.setAttribute('aria-label', 'Your tape as a flat strip')
    ref.current.replaceChildren(c)
  }, [spec, ready])
  return <div className="strip" ref={ref} />
}

export default function App() {
  const [motifs, setMotifs] = useState<Motif[]>([])
  const [layout, setLayout] = useState<Layout>('both')
  const [treatment, setTreatment] = useState<Treatment>('silhouette')
  const [detail, setDetail] = useState(0.5)
  const [palette, setPalette] = useState<Palette>(PRESETS[0].palette)
  const [locks, setLocks] = useState<Locks>({ ink1: false, ink2: false })
  const [base, setBase] = useState<TapeBase>('white')
  const [message, setMessage] = useState('Eat your veggies')
  const [details, setDetails] = useState('From Mom · Oct 2026')
  const [detailsTouched, setDetailsTouched] = useState(false)
  const [fontsReady, setFontsReady] = useState(false)
  const [toast, setToast] = useState('')
  const [dragging, setDragging] = useState(false)
  const box = useRef<BoxPreviewHandle>(null)

  // fonts must be loaded before drawing text on canvas
  useEffect(() => {
    Promise.all([
      document.fonts.load('800 40px "Barlow Condensed"'),
      document.fonts.load('500 20px "IBM Plex Mono"'),
      document.fonts.load('600 20px "IBM Plex Mono"'),
    ]).finally(() => setFontsReady(true))
  }, [])

  // example motifs until the user adds photos
  useEffect(() => {
    Promise.all(SAMPLE_NAMES.map((n) => loadSample(n))).then((canvases) =>
      setMotifs((cur) =>
        cur.length
          ? cur
          : canvases.map((c, i) => ({ id: `s${i}`, name: SAMPLE_NAMES[i], kind: 'sample', status: 'ready', canvas: c, thumb: c.toDataURL() })),
      ),
    )
  }, [])

  const toastTimer = useRef(0)
  const say = useCallback((msg: string) => {
    setToast(msg)
    window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(''), 2600)
  }, [])

  const doShuffle = useCallback(() => setPalette((p) => shuffle(p, locks)), [locks])

  // Space shuffles colors, like coolors.co
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      if (e.code !== 'Space' || ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(tag)) return
      e.preventDefault()
      doShuffle()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [doShuffle])

  const addFiles = useCallback(
    (files: FileList | File[]) => {
      const list = Array.from(files).filter((f) => f.type.startsWith('image/') || /\.(heic|heif)$/i.test(f.name))
      const photos = motifs.filter((m) => m.kind === 'photo').length
      const room = MAX_PHOTOS - photos
      if (!list.length) return say('Those files are not images. Try JPG, PNG or HEIC.')
      if (room <= 0) return say(`You can use up to ${MAX_PHOTOS} photos. Remove one first.`)
      list.slice(0, room).forEach((file) => {
        const id = `p${++nextId}`
        const name = file.name.replace(/\.[^.]+$/, '').slice(0, 18) || 'Photo'
        setMotifs((cur) => [...cur, { id, name, kind: 'photo', status: 'working', note: 'Preparing…' }])
        readPhotoMeta(file).then((meta) => {
          if (detailsTouched || (!meta.date && !meta.place)) return
          setDetails([meta.place, meta.date].filter(Boolean).join(' · '))
          say(`Found ${[meta.place, meta.date].filter(Boolean).join(', ')} in your photo.`)
        })
        cutout(file, (note) => setMotifs((cur) => cur.map((m) => (m.id === id ? { ...m, note } : m))))
          .then(({ canvas, removed }) => {
            setMotifs((cur) => [
              ...cur.filter((m) => m.kind === 'photo').map((m) => (m.id === id ? { ...m, status: 'ready' as const, canvas, thumb: canvas.toDataURL(), note: undefined } : m)),
            ])
            if (!removed) say('Could not cut out the background, so the whole photo is used.')
          })
          .catch(() => {
            setMotifs((cur) => cur.filter((m) => m.id !== id))
            say(`Could not open ${file.name}. Try a JPG or PNG.`)
          })
      })
    },
    [motifs, detailsTouched, say],
  )

  const removeMotif = (id: string) => setMotifs((cur) => cur.filter((m) => m.id !== id))

  const ready = motifs.filter((m) => m.status === 'ready' && m.canvas)
  const spec: TapeSpec = useMemo(
    () => ({ layout, treatment, palette, base, message, details, detail, motifs: ready.map((m) => m.canvas!) }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [layout, treatment, palette, base, message, details, detail, ready.map((m) => m.id).join()],
  )
  const canDraw = fontsReady && ready.length > 0
  const label = useMemo(() => details.split(/\s*·\s*/).slice(0, 2), [details])
  const usingSamples = motifs.some((m) => m.kind === 'sample')

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="wordmark">Peel</span>
          <span className="tagline">Tape that carries what's inside.</span>
        </div>
        <div className="actions">
          <button type="button" className="btn" disabled={!canDraw} onClick={() => downloadCanvas(renderStrip(spec, 1800, 3), 'peel-tape.png')}>
            Download tape
          </button>
          <button type="button" className="btn solid" disabled={!canDraw} onClick={() => box.current && downloadCanvas(box.current.exportCanvas(3), 'peel-box.png')}>
            Download box
          </button>
        </div>
      </header>

      <main className="workspace">
        <section className="stage" aria-label="Preview">
          <BoxPreview ref={box} spec={spec} ready={canDraw} label={label} />
          <div className="strip-wrap">
            <span className="eyebrow">Flat strip</span>
            <StripPreview spec={spec} ready={canDraw} />
          </div>
        </section>

        <aside className="panel" aria-label="Tape settings">
          <section className="group">
            <h2>Photos</h2>
            <label
              className={`drop${dragging ? ' over' : ''}`}
              htmlFor="file"
              onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files) }}
            >
              <strong>Add photos</strong>
              <span>Drop or choose up to {MAX_PHOTOS}. The background is removed on your device.</span>
            </label>
            <input id="file" type="file" accept="image/*,.heic,.heif" multiple hidden onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.target.value = '' }} />
            {usingSamples && <p className="note">Showing example drawings. Your photos replace them.</p>}
            <ul className="motifs">
              {motifs.map((m) => (
                <li key={m.id} className={m.status}>
                  {m.thumb ? <img src={m.thumb} alt={m.name} /> : <span className="spinner" aria-hidden="true" />}
                  {m.status === 'working' && <span className="motif-note">{m.note}</span>}
                  {m.kind === 'photo' && m.status === 'ready' && (
                    <button type="button" className="remove" onClick={() => removeMotif(m.id)} aria-label={`Remove ${m.name}`}>×</button>
                  )}
                </li>
              ))}
            </ul>
          </section>

          <section className="group">
            <h2>Layout</h2>
            <Segmented label="Layout" options={LAYOUTS} value={layout} onChange={setLayout} />
            <p className="note">{LAYOUTS.find((l) => l.id === layout)?.hint}</p>
          </section>

          <section className="group">
            <h2>Print</h2>
            <Segmented label="Print treatment" options={TREATMENTS} value={treatment} onChange={setTreatment} />
            <label className="slider" htmlFor="detail">
              <span>{treatment === 'silhouette' ? 'Line detail' : 'Dot fineness'}</span>
              <input id="detail" type="range" min={0} max={1} step={0.05} value={detail} onChange={(e) => setDetail(+e.target.value)} />
            </label>
            <p className="note">{TREATMENTS.find((t) => t.id === treatment)?.hint}</p>
          </section>

          <section className="group">
            <h2>Colors</h2>
            <ColorControls palette={palette} locks={locks} onPalette={setPalette} onLocks={setLocks} onShuffle={doShuffle} />
            <Segmented label="Tape base" options={[{ id: 'white' as TapeBase, name: 'White tape' }, { id: 'clear' as TapeBase, name: 'Clear tape' }]} value={base} onChange={setBase} />
            {base === 'clear' && <p className="note">Clear tape lets the kraft show through. It shows most with the Pattern layout.</p>}
          </section>

          <section className="group">
            <h2>Words</h2>
            <label className="field" htmlFor="message">
              <span>Message</span>
              <input id="message" type="text" maxLength={32} value={message} onChange={(e) => setMessage(e.target.value)} />
            </label>
            <label className="field" htmlFor="details">
              <span>Details</span>
              <input id="details" type="text" maxLength={48} value={details} onChange={(e) => { setDetails(e.target.value); setDetailsTouched(true) }} />
            </label>
            <p className="note">Separate parts with “·”. Filled in from your photo's place and date when it has them.</p>
          </section>
        </aside>
      </main>

      <div className={`toast${toast ? ' show' : ''}`} role="status">{toast}</div>
    </div>
  )
}
