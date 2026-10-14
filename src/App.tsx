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
import {
    formatStyleParam,
    lineCss,
    parseStyleParam,
    restyle,
} from './lib/style'
import { countHaikus, saveHaikuToGallery } from './lib/gallery'
import { setJustSavedId } from './lib/justSaved'
import { useRoute } from './lib/route'
import { EditorPanel } from './components/EditorPanel'
import { GalleryPage } from './components/GalleryPage'
import { GalleryPreview } from './components/GalleryPreview'
import { Nav } from './components/Nav'
import { ShareDialog } from './components/ShareDialog'
import { Steps } from './components/Steps'

const all = phrases as Phrase[]
const LINES = [0, 1, 2] as
const

const measureCtx = document.createElement('canvas').getContext('2d') !
    function inkBox(el: HTMLElement, lineH: number) {
        const st = getComputedStyle(el)
        measureCtx.font = `${st.fontStyle} ${st.fontWeight} ${st.fontSize} ${st.fontFamily}`
        const raw = el.textContent ?? ''
        const m = measureCtx.measureText(st.textTransform === 'uppercase' ? raw.toUpperCase() : raw)
        const base = (lineH - (m.fontBoundingBoxAscent + m.fontBoundingBoxDescent)) / 2 + m.fontBoundingBoxAscent
        return { top: base - m.actualBoundingBoxAscent, bottom: base + m.actualBoundingBoxDescent }
    }

const CAPTION = ['haiku.guru']

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
    const [history, setHistory] = useState<{ haiku: Haiku; style: typeof style }[]>([])
    const route = useRoute()
    const [count, setCount] = useState<number | null>(null)
    const [previewKey, setPreviewKey] = useState(0)
    const [shareOpen, setShareOpen] = useState(false)
    const closeShare = useCallback(() => setShareOpen(false), [])

    const refreshCount = useCallback(() => {
        countHaikus().then(setCount, () => undefined)
    }, [])
    useEffect(refreshCount, [refreshCount])

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
    }, [fit, haiku, style, route])
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

    const save = async () => {
        try {
            setJustSavedId(await saveHaikuToGallery(haiku, style))
            flash('saved to gallery')
            refreshCount()
            setPreviewKey((k) => k + 1)
        } catch {
            flash('save failed')
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
        const prev = history[history.length - 1]
        if (!prev) return
        bump(LINES.filter((i) => prev.haiku[i].id !== haiku[i].id))
        setHaiku(prev.haiku)
        setStyle(prev.style)
        setHistory((h) => h.slice(0, -1))
    }
    const rerollFont = (i: number) => {
        setHistory((h) => [...h, { haiku, style }])
        bump([i])
        setStyle((s) => restyle(s.faces, s.inks, [i]))
    }
    const rerollEverything = () => {
        setHistory((h) => [...h, { haiku, style }])
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

    const lineStyle = (i: number): React.CSSProperties => ({
        ...lineCss(style, i),
        animationDelay: `${rolls[i].delay}ms`,
    })

    return (
        <div className="page">
            <Nav active={route} count={count} />
            {route === 'gallery' ? (
                <GalleryPage allPhrases={all} count={count} />
            ) : (
                <>
                    <section className="hero">
                        <h1>Tech Billboard Haiku Generator</h1>
                        <p>
                            Click reroll to generate your very own 5-7-5 billboard haiku. All phrases have been taken from real AI ads displayed around the Bay Area.
                        </p>
                    </section>
                    <Steps />

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
                        </div>
                        <EditorPanel
                            haiku={haiku}
                            style={style}
                            locks={locks}
                            canUndo={history.length > 0}
                            status={status}
                            onToggleLock={toggleLock}
                            onRerollFont={rerollFont}
                            onRoll={rerollEverything}
                            onUndo={undo}
                            onCopyText={() => copy(haiku.map((p) => p.text).join('\n'), 'haiku copied')}
                            onCopyLink={() => copy(shareUrl(), 'link copied')}
                            onDownload={download}
                            onInstagram={() => setShareOpen(true)}
                            onSave={save}
                        />
                    </section>

                    {shareOpen && <ShareDialog haiku={haiku} style={style} onClose={closeShare} />}

                    <GalleryPreview allPhrases={all} count={count} refreshKey={previewKey} />
                </>
            )}

            <footer className="footer">
                <span>Made with ❤️ in San Francisco</span>
                <span aria-hidden="true">·</span>
                <span>Created by Sasha Perigo</span>
            </footer>
        </div>
    )
}
