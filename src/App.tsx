import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { computeLayout } from './lib/layout'
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
} from './lib/haiku'

const all = phrases as Phrase[]
const LINES = [0, 1, 2] as
const
const SYLLABLES = [5, 7, 5]

const INKS = ['#12141a', '#000000', '#2b2d33', '#464a52', '#6a6e77', '#8b8f97', '#0047ff', '#e01020', '#00845c', '#7b2ff7', '#ff5c00', '#0098a6', '#c9007a']

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
const STEPS = [
    { icon: '🎲', title: 'Reroll all', desc: 'Shuffle every unlocked line for a brand-new haiku.' },
    { icon: '🔒', title: 'Lock a line', desc: 'Keep a line you like, then reroll the rest around it.' },
    { icon: '⧉', title: 'Copy haiku', desc: 'Copy the three lines as plain text.' },
    { icon: '🔗', title: 'Copy link', desc: 'Copy a URL that reproduces this exact haiku, to share it.' },
]
const BASE_SIZE = ['4.8cqw', '4.2cqw', '4.8cqw']

type Trio = [number, number, number]
const measureCtx = document.createElement('canvas').getContext('2d') !
    function inkBox(el: HTMLElement, lineH: number) {
        const st = getComputedStyle(el)
        measureCtx.font = `${st.fontStyle} ${st.fontWeight} ${st.fontSize} ${st.fontFamily}`
        const raw = el.textContent ?? ''
        const m = measureCtx.measureText(st.textTransform === 'uppercase' ? raw.toUpperCase() : raw)
        const base = (lineH - (m.fontBoundingBoxAscent + m.fontBoundingBoxDescent)) / 2 + m.fontBoundingBoxAscent
        return { top: base - m.actualBoundingBoxAscent, bottom: base + m.actualBoundingBoxDescent }
    }

const pick = (n: number) => Math.floor(Math.random() * n)
const colorOf = (face: number, ink: number) => FACES[face].ink ?? INKS[ink]

function restyle(faces: Trio, inks: Trio, indices: number[]): { faces: Trio;inks: Trio } {
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
    const [haiku, setHaiku] = useState < Haiku > (
        () =>
        parseShareParam(all, new URLSearchParams(window.location.search).get('h')) ??
        generateHaiku(all, Math.random),
    )
    const [locks, setLocks] = useState < Locks > ([false, false, false])
    const [style, setStyle] = useState(() => restyle([0, 0, 0], [0, 0, 0], [0, 1, 2]))
    const [rolls, setRolls] = useState < { n: number;delay: number } [] > ([0, 1, 2].map(() => ({ n: 0, delay: 0 })))
    const [status, setStatus] = useState('')
    const [prev, setPrev] = useState<{ haiku: Haiku; style: typeof style } | null>(null)

    const boxRef = useRef < HTMLDivElement > (null)
    const lineRefs = useRef < (HTMLSpanElement | null)[] > ([])
    const statusTimer = useRef < ReturnType < typeof setTimeout >> (undefined)

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
        const ih: number[] = []
        const dy: number[] = []
        for (const el of els) {
            el!.style.transform = 'scale(1)'
            el!.style.margin = '0'
            w.push(el!.offsetWidth)
            h.push(el!.offsetHeight)
            const ink = inkBox(el!, el!.offsetHeight)
            ih.push(Math.max(ink.bottom - ink.top, 1))
            dy.push((ink.top + ink.bottom) / 2 - el!.offsetHeight / 2)
        }
        if (w.some((x) => x === 0)) return
        const { s, lead } = computeLayout({ availW, availH, gap, w, ih })
        els.forEach((el, i) => {
            el!.style.transform = `translateY(${-s[i] * dy[i]}px) scale(${s[i]})`
            el!.style.margin = `${(s[i] * ih[i] - h[i]) / 2 + lead / 2}px 0`
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
        document.fonts ?.ready.then(fit)
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

    const undo = () => {
        if (!prev) return
        bump(LINES.filter((i) => prev.haiku[i].id !== haiku[i].id))
        setHaiku(prev.haiku)
        setStyle(prev.style)
        setPrev(null)
    }
    const rerollEverything = () => {
        setPrev({ haiku, style })
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
        <div className="page">
            <section className="hero">
                <h1>Billboard Haiku</h1>
                <p>
                    A generator that assembles a 5-7-5 haiku from real startup-billboard one-liners, then hangs it on a SoMa
                    billboard. Every line picks its own typeface, weight, and ink on each roll, so no two postings look alike.
                </p>
            </section>

            <section id="app" className="app">
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
                                        data-tip={locks[i] ? `Unlock line ${i + 1}` : `Lock line ${i + 1}`}
                                        onClick={() => toggleLock(i)}
                                    >
                                        {locks[i] ? '🔒' : '🔓'}
                                    </button>
                                </div>
                            ))}
                        </div>
                        <div className="actions">
                            <button
                                type="button"
                                className="circle action undo"
                                aria-label="Undo"
                                data-tip="Undo"
                                disabled={!prev}
                                onClick={undo}
                            >
                                ↶
                            </button>
                            <button
                                type="button"
                                className="circle action reroll-all"
                                aria-label="Reroll all"
                                data-tip="Reroll all"
                                disabled={locks.every(Boolean)}
                                onClick={rerollEverything}
                            >
                                🎲
                            </button>
                            <button
                                type="button"
                                className="circle action"
                                aria-label="Copy haiku"
                                data-tip="Copy haiku"
                                onClick={() => copy(haiku.map((p) => p.text).join('\n'), 'haiku copied')}
                            >
                                ⧉
                            </button>
                            <button
                                type="button"
                                className="circle action"
                                aria-label="Copy link"
                                data-tip="Copy share link"
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
            </section>

            <section className="howto">
                <h2>How to use it</h2>
                <div className="cards">
                    {STEPS.map((s) => (
                        <div className="card" key={s.title}>
                            <div className="card-icon" aria-hidden="true">{s.icon}</div>
                            <div className="card-text">
                                <div className="card-title">{s.title}</div>
                                <div className="card-desc">{s.desc}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            <footer className="footer">
                <span>Made with ❤️ in San Francisco</span>
                <span aria-hidden="true">·</span>
                <span>Created by Sasha Perigo</span>
            </footer>
        </div>
    )
}
