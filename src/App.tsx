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
const svgProps = {
    viewBox: '0 0 24 24',
    width: '1em',
    height: '1em',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true,
} as const
const ShareIcon = () => (
    <svg {...svgProps}>
        <path d="M12 15V3" />
        <path d="M7.5 7.5 12 3l4.5 4.5" />
        <path d="M8 11H6.5A1.5 1.5 0 0 0 5 12.5v6A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5v-6A1.5 1.5 0 0 0 17.5 11H16" />
    </svg>
)
const UndoIcon = () => (
    <svg {...svgProps}>
        <path d="M9 14 4 9l5-5" />
        <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
    </svg>
)
const DownloadIcon = () => (
    <svg {...svgProps}>
        <path d="M12 3v12" />
        <path d="M7.5 10.5 12 15l4.5-4.5" />
        <path d="M5 20h14" />
    </svg>
)
const STEPS = [
    { icon: '🎲', title: 'Reroll all', desc: 'Shuffle every unlocked line for a brand-new haiku.' },
    { icon: '🔒', title: 'Lock a line', desc: 'Keep a line you like, then reroll the rest around it.' },
    { icon: 'Aa', title: 'Reroll font', desc: 'Give one line a new typeface and ink without changing its words.' },
    { icon: '⧉', title: 'Copy haiku', desc: 'Copy the three lines as plain text.' },
    { icon: <DownloadIcon />, title: 'Download image', desc: 'Save the billboard with your haiku as a PNG.' },
    { icon: <ShareIcon />, title: 'Copy link', desc: 'Copy a URL that reproduces this exact haiku, fonts and colors included.' },
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

const CAPTION = ['Make yours at', 'haiku.guru']

async function renderPng(stage: HTMLElement, lines: HTMLElement[]): Promise<Blob> {
    const img = stage.querySelector('img')!
    await img.decode().catch(() => undefined)
    const k = img.naturalWidth / stage.clientWidth
    const canvas = document.createElement('canvas')
    canvas.width = img.naturalWidth
    canvas.height = Math.round(stage.clientHeight * k)
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    const px = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const lut = Array.from({ length: 256 }, (_, v) => Math.round(255 * (v / 255) ** 0.65))
    for (let i = 0; i < px.data.length; i += 4) {
        px.data[i] = lut[px.data[i]]
        px.data[i + 1] = lut[px.data[i + 1]]
        px.data[i + 2] = lut[px.data[i + 2]]
    }
    ctx.putImageData(px, 0, 0)

    const specs = lines.map((el) => {
        const st = getComputedStyle(el)
        const scale = new DOMMatrix(st.transform).a * k
        return { el, st, scale, font: `${st.fontStyle} ${st.fontWeight} ${parseFloat(st.fontSize) * scale}px ${st.fontFamily}` }
    })
    const caption = `italic 400 ${Math.max(canvas.width * 0.022, 14)}px 'Open Sans', sans-serif`
    await Promise.all([...specs.map((s) => s.font), caption].map((f) => document.fonts.load(f, 'Aa')))

    const sr = stage.getBoundingClientRect()
    for (const { el, st, scale, font } of specs) {
        const r = el.getBoundingClientRect()
        const m = (ctx.font = font, ctx.measureText('Hg'))
        ctx.save()
        ctx.translate(((r.left + r.width / 2) - sr.left) * k, ((r.top + r.height / 2) - sr.top) * k)
        ctx.rotate((-0.28 * Math.PI) / 180)
        ctx.font = font
        ctx.letterSpacing = `${(parseFloat(st.letterSpacing) || 0) * scale}px`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'alphabetic'
        ctx.globalAlpha = 0.92
        ctx.globalCompositeOperation = 'multiply'
        ctx.fillStyle = st.color
        if (st.textShadow !== 'none') {
            ctx.shadowColor = st.textShadow.match(/rgba?\([^)]+\)/)?.[0] ?? 'transparent'
            ctx.shadowBlur = 12 * k
        }
        const text = st.textTransform === 'uppercase' ? (el.textContent ?? '').toUpperCase() : (el.textContent ?? '')
        ctx.fillText(text, 0, (m.fontBoundingBoxAscent - m.fontBoundingBoxDescent) / 2)
        ctx.restore()
    }

    ctx.font = caption
    ctx.textAlign = 'right'
    ctx.textBaseline = 'alphabetic'
    ctx.fillStyle = '#ffffff'
    ctx.shadowColor = 'rgba(0,0,0,0.6)'
    ctx.shadowBlur = canvas.width * 0.004
    const pad = canvas.width * 0.02
    const leading = Math.max(canvas.width * 0.022, 14) * 1.3
    CAPTION.forEach((line, i) =>
        ctx.fillText(line, canvas.width - pad, canvas.height - pad - (CAPTION.length - 1 - i) * leading),
    )
    return new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('toBlob failed'))), 'image/png'))
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

const formatStyleParam = (st: { faces: Trio; inks: Trio }) =>
    LINES.map((i) => `${st.faces[i]}.${st.inks[i]}`).join(',')

function parseStyleParam(value: string | null): { faces: Trio; inks: Trio } | null {
    const parts = value?.split(',')
    if (parts?.length !== 3) return null
    const faces: number[] = []
    const inks: number[] = []
    for (const part of parts) {
        const m = /^(\d+)\.(\d+)$/.exec(part)
        if (!m || +m[1] >= FACES.length || +m[2] >= INKS.length) return null
        faces.push(+m[1])
        inks.push(+m[2])
    }
    return { faces: faces as Trio, inks: inks as Trio }
}

export default function App() {
    const [haiku, setHaiku] = useState < Haiku > (
        () =>
        parseShareParam(all, new URLSearchParams(window.location.search).get('h')) ??
        generateHaiku(all, Math.random),
    )
    const [locks, setLocks] = useState < Locks > ([false, false, false])
    const [style, setStyle] = useState(
        () =>
            parseStyleParam(new URLSearchParams(window.location.search).get('s')) ??
            restyle([0, 0, 0], [0, 0, 0], [0, 1, 2]),
    )
    const [rolls, setRolls] = useState < { n: number;delay: number } [] > ([0, 1, 2].map(() => ({ n: 0, delay: 0 })))
    const [status, setStatus] = useState('')
    const [prev, setPrev] = useState<{ haiku: Haiku; style: typeof style } | null>(null)

    const [helpOpen, setHelpOpen] = useState(false)
    const helpRef = useRef<HTMLDivElement>(null)
    useEffect(() => {
        if (!helpOpen) return
        const onDown = (e: MouseEvent) => {
            if (!helpRef.current?.contains(e.target as Node)) setHelpOpen(false)
        }
        const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setHelpOpen(false)
        document.addEventListener('mousedown', onDown)
        document.addEventListener('keydown', onKey)
        return () => {
            document.removeEventListener('mousedown', onDown)
            document.removeEventListener('keydown', onKey)
        }
    }, [helpOpen])

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

    const stageRef = useRef<HTMLDivElement>(null)
    const download = async () => {
        if (!stageRef.current) return
        try {
            const blob = await renderPng(stageRef.current, lineRefs.current as HTMLElement[])
            const a = document.createElement('a')
            a.href = URL.createObjectURL(blob)
            a.download = 'billboard-haiku.png'
            a.click()
            setTimeout(() => URL.revokeObjectURL(a.href), 1000)
        } catch {
            flash('download failed')
        }
    }

    const toggleLock = (i: number) =>
        setLocks((l) => l.map((v, j) => (j === i ? !v : v)) as unknown as Locks)

    const shareUrl = () => {
        const url = new URL(window.location.href)
        url.search = ''
        url.hash = ''
        url.searchParams.set('h', formatShareParam(haiku))
        url.searchParams.set('s', formatStyleParam(style))
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
    const rerollFont = (i: number) => {
        setPrev({ haiku, style })
        bump([i])
        setStyle((s) => restyle(s.faces, s.inks, [i]))
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
            <div className="help" ref={helpRef}>
                <button
                    type="button"
                    className="help-btn"
                    aria-expanded={helpOpen}
                    aria-controls="help-card"
                    onClick={() => setHelpOpen((o) => !o)}
                >
                    Help
                </button>
                {helpOpen && (
                    <div id="help-card" className="help-card" role="dialog" aria-label="Instructions">
                        <h2>How to use it</h2>
                        <ul>
                            {STEPS.map((s) => (
                                <li key={s.title}>
                                    <span className="help-icon" aria-hidden="true">{s.icon}</span>
                                    <span>
                                        <strong>{s.title}</strong>
                                        <span className="help-desc">{s.desc}</span>
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
            <section className="hero">
                <h1>Tech Billboard Haiku Generator</h1>
                <p>
                    Click reroll to generate your very own 5-7-5 billboard haiku. All phrases have been taken from real AI ads displayed around the Bay Area.
                </p>
            </section>

            <section id="app" className="app">
                <div className="frame">
                    <div className="stage" ref={stageRef}>
                    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true" focusable="false">
                        <filter id="lift-shadows" colorInterpolationFilters="sRGB">
                            <feComponentTransfer>
                                <feFuncR type="gamma" amplitude="1" exponent="0.65" offset="0" />
                                <feFuncG type="gamma" amplitude="1" exponent="0.65" offset="0" />
                                <feFuncB type="gamma" amplitude="1" exponent="0.65" offset="0" />
                            </feComponentTransfer>
                        </filter>
                    </svg>
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
                    </div>

                    <div className="controls">
                        <div className="lines-card">
                            {LINES.map((i) => (
                                <div className="row" key={i}>
                                    <span className="syl">
                                        <span className="syl-long">Line {i + 1} · </span>
                                        {SYLLABLES[i]}
                                        <span className="syl-long"> syllables</span>
                                    </span>
                                    <button
                                        type="button"
                                        className="circle lock font-btn"
                                        aria-label={`Reroll font for line ${i + 1}`}
                                        data-tip="Reroll font"
                                        disabled={locks[i]}
                                        onClick={() => rerollFont(i)}
                                    >
                                        Aa
                                    </button>
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
                                className="circle action undo"
                                aria-label="Undo"
                                data-tip="Undo"
                                disabled={!prev}
                                onClick={undo}
                            >
                                <UndoIcon />
                            </button>
                            <button
                                type="button"
                                className="circle action push-right"
                                aria-label="Copy haiku"
                                data-tip="Copy haiku"
                                onClick={() => copy(haiku.map((p) => p.text).join('\n'), 'haiku copied')}
                            >
                                ⧉
                            </button>
                            <button
                                type="button"
                                className="circle action"
                                aria-label="Download image"
                                data-tip="Download image"
                                onClick={download}
                            >
                                <DownloadIcon />
                            </button>
                            <button
                                type="button"
                                className="circle action"
                                aria-label="Copy link"
                                data-tip="Copy share link"
                                onClick={() => copy(shareUrl(), 'link copied')}
                            >
                                <ShareIcon />
                            </button>
                        </div>
                        <div className="status" role="status">
                            {status}
                        </div>
                    </div>
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
