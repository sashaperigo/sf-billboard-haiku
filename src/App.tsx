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

const INKS = ['#12141a', '#0047ff', '#e01020', '#00845c', '#7b2ff7', '#ff5c00', '#0098a6', '#c9007a']

interface Face {
  family: string
  fallback: string
  weight: number
  italic: boolean
  upper: boolean
  spacing: string
  size: number
  ink?: string
  glow?: string
}
const F = (
  family: string,
  fallback: string,
  weight: number,
  italic: boolean,
  upper: boolean,
  spacing: string,
  size: number,
  ink?: string,
  glow?: string,
): Face => ({ family, fallback, weight, italic, upper, spacing, size, ink, glow })
const S = 'sans-serif'
const SR = 'serif'
const M = 'monospace'
const FACES: Face[] = [
  F('Archivo Black', S, 400, false, true, '-0.02em', 0.88),
  F('Bebas Neue', S, 400, false, true, '0.02em', 1.3),
  F('Barlow Condensed', S, 700, false, true, '0.02em', 1.2),
  F('Big Shoulders Display', S, 800, false, true, '0.01em', 1.3),
  F('Space Grotesk', S, 700, false, false, '-0.03em', 1.0),
  F('Manrope', S, 800, false, false, '-0.03em', 1.0),
  F('Sora', S, 700, false, false, '-0.02em', 0.95),
  F('Righteous', S, 400, false, false, '0', 1.0),
  F('Bungee', S, 400, false, true, '0', 0.82),
  F('IBM Plex Mono', M, 500, true, false, '0', 0.88),
  F('Space Mono', M, 700, false, false, '-0.02em', 0.88),
  F('VT323', M, 400, false, false, '0.01em', 1.24),
  F('DM Serif Display', SR, 400, false, false, '0', 1.12),
  F('Instrument Serif', SR, 400, true, false, '0', 1.18),
  F('Silkscreen', S, 700, false, true, '0.04em', 0.88, '#ff45a8'),
  F('Audiowide', S, 400, false, false, '0', 0.88, '#e5177f', '0 0 5px rgba(229,23,127,0.18)'),
  F('Wallpoet', S, 400, false, true, '0.02em', 0.94, '#ff2d95'),
  F('Comic Neue', S, 700, true, false, '0', 1.05, '#ff2d95'),
  F('Bungee Inline', S, 400, false, true, '0', 0.82, '#00b8d4'),
  F('Turret Road', S, 800, false, true, '0.01em', 0.88, '#e07b00', '0 0 12px rgba(224,123,0,0.45)'),
  F('Kanit', S, 800, true, true, '-0.01em', 0.94, '#e04e00'),
  F('Bodoni Moda', SR, 900, false, false, '-0.01em', 1.18),
  F('Playfair Display', SR, 900, false, false, '-0.015em', 1.12),
  F('Prata', SR, 400, false, false, '0', 1.0),
  F('Bricolage Grotesque', S, 800, false, false, '-0.03em', 1.0),
  F('Libre Franklin', S, 900, false, true, '-0.01em', 0.88),
  F('Epilogue', S, 800, true, false, '-0.03em', 1.0),
  F('Newsreader', SR, 600, true, false, '0', 1.12),
]
const BASE_SIZE = ['4.8cqw', '4.2cqw', '4.8cqw']

type Trio = [number, number, number]
const pick = (n: number) => Math.floor(Math.random() * n)
const colorOf = (face: number, ink: number) => FACES[face].ink ?? INKS[ink]

function restyle(faces: Trio, inks: Trio, indices: number[]): { faces: Trio; inks: Trio } {
  const f = [...faces] as Trio
  const c = [...inks] as Trio
  for (const i of indices) {
    const others = LINES.filter((j) => j !== i)
    const taken = () => others.map((j) => colorOf(f[j], c[j]))
    let face = pick(FACES.length)
    for (let t = 0; t < 40; t++) {
      const fixed = FACES[face].ink
      const clash =
        others.some((j) => FACES[f[j]].family === FACES[face].family) ||
        (fixed !== undefined && taken().includes(fixed))
      if (!clash) break
      face = pick(FACES.length)
    }
    let ink = pick(INKS.length)
    for (let t = 0; t < 20 && taken().includes(INKS[ink]); t++) ink = pick(INKS.length)
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
  const [rolls, setRolls] = useState<{ n: number; delay: number }[]>([0, 1, 2].map(() => ({ n: 0, delay: 0 })))
  const [status, setStatus] = useState('')
  const [aboutOpen, setAboutOpen] = useState(false)

  const boxRef = useRef<HTMLDivElement>(null)
  const lineRefs = useRef<(HTMLSpanElement | null)[]>([])
  const statusTimer = useRef<ReturnType<typeof setTimeout>>(undefined)

  const fit = useCallback(() => {
    const box = boxRef.current
    const els = lineRefs.current
    if (!box || els.some((e) => !e)) return
    const cs = getComputedStyle(box)
    const availW = box.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)
    const availH = box.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom)
    const gap = parseFloat(cs.rowGap) || 0
    if (availW <= 0 || availH <= 0) return
    const w: number[] = []
    const h: number[] = []
    for (const el of els) {
      el!.style.transform = 'scale(1)'
      el!.style.margin = '0'
      w.push(el!.offsetWidth)
      h.push(el!.offsetHeight)
    }
    if (w.some((x) => x === 0)) return
    const lead = availH * 0.05
    const budget = availH - lead * 3 - gap * 2
    let s = [1, 1, 1]
    for (const ratio of [0.88, 0.8, 0.72, 0.62, 0.52, 0.42]) {
      const mid = Math.min(availW / w[1], 6)
      const target = ratio * mid * w[1]
      s = [Math.min(target / w[0], 6), mid, Math.min(target / w[2], 6)]
      const total = s[0] * h[0] + s[1] * h[1] + s[2] * h[2]
      if (total > budget) {
        const left = budget - s[1] * h[1]
        if (left > 0.22 * budget) {
          const outer = s[0] * h[0] + s[2] * h[2]
          const k = left / outer
          s = [s[0] * k, s[1], s[2] * k]
        } else {
          const k = Math.max(budget / total, 0.2)
          s = s.map((x) => x * k)
        }
      }
      if (s[1] * w[1] >= 0.75 * availW) break
    }
    els.forEach((el, i) => {
      el!.style.transform = `scale(${s[i]})`
      el!.style.margin = `${(s[i] * h[i] - h[i]) / 2 + lead / 2}px 0`
    })
  }, [])

  useLayoutEffect(fit)
  useEffect(() => {
    const raf = requestAnimationFrame(fit)
    const timers = [120, 400, 1200].map((ms) => setTimeout(fit, ms))
    return () => {
      cancelAnimationFrame(raf)
      timers.forEach(clearTimeout)
    }
  }, [fit, haiku, style])
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

  const bump = (indices: number[]) =>
    setRolls((r) =>
      r.map((x, j) => {
        const k = indices.indexOf(j)
        return k < 0 ? x : { n: x.n + 1, delay: k * 60 }
      }),
    )

  const rerollOne = (i: 0 | 1 | 2) => {
    if (locks[i]) return
    bump([i])
    setHaiku((h) => rerollLine(all, h, i, Math.random))
    setStyle((s) => restyle(s.faces, s.inks, [i]))
  }
  const rerollEverything = () => {
    bump(LINES.filter((i) => !locks[i]))
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
      textTransform: face.upper ? 'uppercase' : 'none',
      color: colorOf(style.faces[i], style.inks[i]),
      textShadow: face.glow ?? 'none',
      animationDelay: `${rolls[i].delay}ms`,
    }
  }

  return (
    <div className="stage">
      <h1 className="visually-hidden">Haiku Generator</h1>
      <div className="frame">
        <img src={billboard} alt="A South of Market billboard" />

        <div ref={boxRef} data-testid="haiku" className="haiku" aria-live="polite">
          {LINES.map((i) => (
            <span
              key={`${i}-${rolls[i].n}`}
              className={rolls[i].n > 0 ? 'reveal' : undefined}
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
        <div className="surface sheen" />
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
                <dd>Photo credit to be added. Billboard face digitally blanked.</dd>
                <dt>Type</dt>
                <dd>
                  {[...new Set(FACES.map((f) => f.family))].join(', ')}
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
