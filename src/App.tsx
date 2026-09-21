import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import phrases from './data/phrases.json'
import billboard from './assets/billboard.png'
import {
  type Haiku,
  type Locks,
  type Phrase,
  formatShareParam,
  generateHaiku,
  parseShareParam,
  rerollAll,
  rerollLine,
} from './lib/haiku'

const all = phrases as Phrase[]
const LINES = [0, 1, 2] as const
const SYLLABLES = [5, 7, 5]

const INKS = ['#f6f1e7', '#ffb347', '#ff6f9c', '#6fe3ff', '#c8f24a', '#b79cff', '#ff4d3d', '#ffe45e']

interface Face {
  family: string
  fallback: string
  weight: number
  italic: boolean
  size: number
  spacing: string
  transform: 'none' | 'uppercase' | 'lowercase'
}
const FACES: Face[] = [
  { family: 'Playfair Display', fallback: 'serif', weight: 700, italic: false, size: 1.0, spacing: '-0.01em', transform: 'none' },
  { family: 'Playfair Display', fallback: 'serif', weight: 500, italic: true, size: 1.02, spacing: '0', transform: 'none' },
  { family: 'Bebas Neue', fallback: 'sans-serif', weight: 400, italic: false, size: 1.28, spacing: '0.03em', transform: 'uppercase' },
  { family: 'Space Mono', fallback: 'monospace', weight: 700, italic: false, size: 0.82, spacing: '-0.02em', transform: 'lowercase' },
  { family: 'Space Mono', fallback: 'monospace', weight: 400, italic: true, size: 0.84, spacing: '0', transform: 'none' },
  { family: 'Abril Fatface', fallback: 'serif', weight: 400, italic: false, size: 0.98, spacing: '0', transform: 'none' },
  { family: 'Caveat', fallback: 'cursive', weight: 600, italic: false, size: 1.34, spacing: '0', transform: 'none' },
  { family: 'Libre Baskerville', fallback: 'serif', weight: 400, italic: true, size: 0.8, spacing: '0', transform: 'none' },
  { family: 'Archivo Black', fallback: 'sans-serif', weight: 400, italic: false, size: 0.85, spacing: '-0.015em', transform: 'uppercase' },
  { family: 'Cormorant Garamond', fallback: 'serif', weight: 400, italic: true, size: 1.22, spacing: '0.01em', transform: 'none' },
  { family: 'Cormorant Garamond', fallback: 'serif', weight: 600, italic: false, size: 1.18, spacing: '0.06em', transform: 'uppercase' },
]
const BASE_SIZE = ['3.1cqw', '2.7cqw', '3.1cqw']

type Trio = [number, number, number]
const pick = (n: number) => Math.floor(Math.random() * n)

function restyle(faces: Trio, inks: Trio, indices: number[]): { faces: Trio; inks: Trio } {
  const f = [...faces] as Trio
  const c = [...inks] as Trio
  for (const i of indices) {
    const others = LINES.filter((j) => j !== i)
    let face = pick(FACES.length)
    let ink = pick(INKS.length)
    for (let t = 0; t < 20; t++) {
      const clash =
        others.some((j) => FACES[f[j]].family === FACES[face].family) ||
        others.some((j) => c[j] === ink)
      if (!clash) break
      face = pick(FACES.length)
      ink = pick(INKS.length)
    }
    f[i] = face
    c[i] = ink
  }
  return { faces: f, inks: c }
}

export default function App() {
  const [haiku, setHaiku] = useState<Haiku>(
    () =>
      parseShareParam(all, new URLSearchParams(window.location.search).get('h')) ??
      generateHaiku(all, Math.random),
  )
  const [locks, setLocks] = useState<Locks>([false, false, false])
  const [style, setStyle] = useState(() => restyle([0, 0, 0], [0, 0, 0], [0, 1, 2]))
  const [status, setStatus] = useState('')
  const [aboutOpen, setAboutOpen] = useState(false)

  const boxRef = useRef<HTMLDivElement>(null)
  const lineRefs = useRef<(HTMLSpanElement | null)[]>([])
  const statusTimer = useRef<ReturnType<typeof setTimeout>>(undefined)

  const fit = useCallback(() => {
    const box = boxRef.current
    if (!box) return
    const cs = getComputedStyle(box)
    const avail = box.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)
    for (const el of lineRefs.current) {
      if (!el) continue
      el.style.transform = 'scale(1)'
      const w = el.offsetWidth
      if (avail > 0 && w > avail) el.style.transform = `scale(${avail / w})`
    }
  }, [])

  useLayoutEffect(fit)
  useEffect(() => {
    window.addEventListener('resize', fit)
    document.fonts?.ready.then(fit)
    return () => window.removeEventListener('resize', fit)
  }, [fit])
  useEffect(() => () => clearTimeout(statusTimer.current), [])

  const flash = (msg: string) => {
    setStatus(msg)
    clearTimeout(statusTimer.current)
    statusTimer.current = setTimeout(() => setStatus(''), 2000)
  }
  const copy = async (text: string, ok: string) => {
    try {
      await navigator.clipboard.writeText(text)
      flash(ok)
    } catch {
      flash('copy failed')
    }
  }

  const toggleLock = (i: number) =>
    setLocks((l) => l.map((v, j) => (j === i ? !v : v)) as unknown as Locks)

  const shareUrl = () => {
    const url = new URL(window.location.href)
    url.search = ''
    url.hash = ''
    url.searchParams.set('h', formatShareParam(haiku))
    return url.toString()
  }

  const rerollOne = (i: 0 | 1 | 2) => {
    if (locks[i]) return
    setHaiku((h) => rerollLine(all, h, i, Math.random))
    setStyle((s) => restyle(s.faces, s.inks, [i]))
  }
  const rerollEverything = () => {
    setHaiku((h) => rerollAll(all, h, locks, Math.random))
    setStyle((s) =>
      restyle(
        s.faces,
        s.inks,
        LINES.filter((i) => !locks[i]),
      ),
    )
  }

  const lineStyle = (i: number): React.CSSProperties => {
    const face = FACES[style.faces[i]]
    return {
      fontFamily: `'${face.family}', ${face.fallback}`,
      fontWeight: face.weight,
      fontStyle: face.italic ? 'italic' : 'normal',
      fontSize: `calc(${BASE_SIZE[i]} * ${face.size})`,
      letterSpacing: face.spacing,
      textTransform: face.transform,
      color: INKS[style.inks[i]],
    }
  }

  return (
    <div className="stage">
      <h1 className="visually-hidden">Haiku Generator</h1>
      <div className="frame">
        <img src={billboard} alt="A South of Market billboard, blacked out" />

        <div ref={boxRef} data-testid="haiku" className="haiku" aria-live="polite">
          {LINES.map((i) => (
            <span
              key={i}
              data-testid={`line-${i + 1}`}
              ref={(el) => {
                lineRefs.current[i] = el
              }}
              style={lineStyle(i)}
            >
              {haiku[i].text}
            </span>
          ))}
        </div>
        <div className="surface seams" />
        <div className="surface wash" />
        <div className="surface vignette" />

        <div className="info">
          <button
            type="button"
            className="info-btn"
            aria-label="About"
            aria-expanded={aboutOpen}
            onClick={() => setAboutOpen((o) => !o)}
          >
            i
          </button>
          {aboutOpen && (
            <div className="about">
              <h2>Billboard Haiku</h2>
              <p>
                A 5-7-5 haiku assembled from a bundled pool of prewritten phrases and posted to a South of
                Market billboard. Reroll any line, lock the ones you like, then copy the poem or a share
                link.
              </p>
              <p>Every line picks its own typeface, weight, and ink on each roll, so no two postings look alike.</p>
              <dl>
                <dt>Photo</dt>
                <dd>
                  “
                  <a href="https://www.flickr.com/photos/thomashawk/52606988548" target="_blank" rel="noopener noreferrer">
                    What's That You Got in Your Pocket
                  </a>
                  ” by{' '}
                  <a href="https://www.flickr.com/photos/thomashawk/" target="_blank" rel="noopener noreferrer">
                    Thomas Hawk
                  </a>
                  ,{' '}
                  <a
                    href="https://creativecommons.org/licenses/by-nc/2.0/deed.en"
                    target="_blank"
                    rel="license noopener noreferrer"
                  >
                    CC BY-NC 2.0
                  </a>
                  . Billboard digitally blanked.
                </dd>
                <dt>Type</dt>
                <dd>
                  Playfair Display, Bebas Neue, Space Mono, Abril Fatface, Caveat, Libre Baskerville, Archivo
                  Black, Cormorant Garamond
                </dd>
                <dt>Phrases</dt>
                <dd>{all.length} in the pool</dd>
              </dl>
            </div>
          )}
        </div>

        <div className="controls">
          <div className="lines-card">
            {LINES.map((i) => (
              <div className="row" key={i}>
                <span className="syl">{SYLLABLES[i]}</span>
                <button
                  type="button"
                  className="circle lock"
                  aria-label={`Lock line ${i + 1}`}
                  aria-pressed={locks[i]}
                  title={locks[i] ? `Unlock line ${i + 1}` : `Lock line ${i + 1}`}
                  onClick={() => toggleLock(i)}
                >
                  {locks[i] ? '🔒' : '🔓'}
                </button>
                <button
                  type="button"
                  className="circle reroll-line"
                  aria-label={`Reroll line ${i + 1}`}
                  disabled={locks[i]}
                  onClick={() => rerollOne(i)}
                >
                  ↻
                </button>
              </div>
            ))}
          </div>
          <div className="actions">
            <button
              type="button"
              className="pill"
              aria-label="Reroll all"
              title="Reroll the whole haiku"
              disabled={locks.every(Boolean)}
              onClick={rerollEverything}
            >
              🎲 reroll
            </button>
            <button
              type="button"
              className="round"
              aria-label="Copy haiku"
              title="Copy the haiku"
              onClick={() => copy(haiku.map((p) => p.text).join('\n'), 'haiku copied')}
            >
              ⧉
            </button>
            <button
              type="button"
              className="round"
              aria-label="Copy link"
              title="Copy a share link"
              onClick={() => copy(shareUrl(), 'link copied')}
            >
              🔗
            </button>
          </div>
          <div className="status" role="status">
            {status}
          </div>
        </div>
      </div>
    </div>
  )
}
