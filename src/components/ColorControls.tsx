import { PRESETS, type Locks, type Palette } from '../lib/palette'

type Props = {
  palette: Palette
  locks: Locks
  onPalette: (p: Palette) => void
  onLocks: (l: Locks) => void
  onShuffle: () => void
}

const INKS: { key: keyof Palette; name: string }[] = [
  { key: 'ink1', name: 'Ink 1' },
  { key: 'ink2', name: 'Ink 2' },
]

export function ColorControls({ palette, locks, onPalette, onLocks, onShuffle }: Props) {
  return (
    <div className="colors">
      <div className="inks">
        {INKS.map(({ key, name }) => (
          <div className="ink" key={key}>
            <label className="swatch" style={{ background: palette[key] }} htmlFor={`pick-${key}`}>
              <input
                id={`pick-${key}`}
                type="color"
                value={palette[key].toLowerCase()}
                onChange={(e) => onPalette({ ...palette, [key]: e.target.value.toUpperCase() })}
                aria-label={`Choose ${name}`}
              />
            </label>
            <div className="ink-meta">
              <span className="ink-name">{name}</span>
              <span className="mono">{palette[key]}</span>
            </div>
            <button
              type="button"
              className="lock"
              aria-pressed={locks[key]}
              onClick={() => onLocks({ ...locks, [key]: !locks[key] })}
              title={locks[key] ? 'Unlock: shuffle can change this ink' : 'Lock: keep this ink when shuffling'}
            >
              {locks[key] ? 'Locked' : 'Lock'}
            </button>
          </div>
        ))}
      </div>
      <button type="button" className="shuffle" onClick={onShuffle}>
        Shuffle colors <kbd>Space</kbd>
      </button>
      <div className="presets" role="group" aria-label="Color presets">
        {PRESETS.map((p) => {
          const on = p.palette.ink1 === palette.ink1 && p.palette.ink2 === palette.ink2
          return (
            <button type="button" key={p.name} className="preset" aria-pressed={on} onClick={() => onPalette(p.palette)}>
              <span className="dots" aria-hidden="true">
                <i style={{ background: p.palette.ink1 }} />
                <i style={{ background: p.palette.ink2 }} />
              </span>
              {p.name}
            </button>
          )
        })}
      </div>
    </div>
  )
}
