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
import { countHaikus, saveHaikuToGallery, upvoteHaiku } from './lib/gallery'
import { setJustSavedId } from './lib/justSaved'
import { rememberVote } from './lib/useVoting'
import type { ShareId } from './lib/shareImage'
import { useMediaQuery } from './lib/useMediaQuery'
import { useShareRenders } from './lib/useShareRenders'
import { useRoute } from './lib/route'
import { PostcardCard } from './components/PostcardCard'
import { EditorPanel } from './components/EditorPanel'
import { GalleryPage } from './components/GalleryPage'
import { GalleryPreview } from './components/GalleryPreview'
import { HelpCard, HelpSheet } from './components/HelpPanel'
import { Nav } from './components/Nav'
import { SaveDialog } from './components/SaveDialog'
import { Artboards } from './components/ShareArtboards'
import { ShareDialog } from './components/ShareDialog'
import { Steps } from './components/Steps'

const all = phrases as Phrase[]
const LINES = [0, 1, 2] as
const

const HELP_KEY = 'bh-help-dismissed'
const readHelpDismissed = () => {
    try {
        return localStorage.getItem(HELP_KEY) === '1'
    } catch {
        return false
    }
}

const measureCtx = document.createElement('canvas').getContext('2d') !
    function inkBox(el: HTMLElement, lineH: number) {
        const st = getComputedStyle(el)
        measureCtx.font = `${st.fontStyle} ${st.fontWeight} ${st.fontSize} ${st.fontFamily}`
        const raw = el.textContent ?? ''
        const m = measureCtx.measureText(st.textTransform === 'uppercase' ? raw.toUpperCase() : raw)
        const base = (lineH - (m.fontBoundingBoxAscent + m.fontBoundingBoxDescent)) / 2 + m.fontBoundingBoxAscent
        return { top: base - m.actualBoundingBoxAscent, bottom: base + m.actualBoundingBoxDescent }
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
    const [saveResult, setSaveResult] = useState<{ ok: boolean; n: number } | null>(null)
    const [history, setHistory] = useState<{ haiku: Haiku; style: typeof style }[]>([])
    const route = useRoute()
    const [count, setCount] = useState<number | null>(null)
    const [previewKey, setPreviewKey] = useState(0)
    const [shareOpen, setShareOpen] = useState(false)
    const [saveOpen, setSaveOpen] = useState(false)
    const [shareInitial, setShareInitial] = useState<ShareId | undefined>()
    const [helpOpen, setHelpOpen] = useState(false)
    const [helpDismissed, setHelpDismissed] = useState(readHelpDismissed)
    const [rendersIdle, setRendersIdle] = useState(false)
    const isMobile = useMediaQuery('(max-width: 700px)')
    const closeShare = useCallback(() => setShareOpen(false), [])
    const closeHelp = useCallback(() => setHelpOpen(false), [])
    const artboardsRef = useRef<HTMLDivElement>(null)
    const artboardsOn = route !== 'gallery' && (rendersIdle || shareOpen)
    const renders = useShareRenders(artboardsRef, haiku, style, artboardsOn)
    const openShare = (id?: ShareId) => {
        setShareInitial(id)
        setShareOpen(true)
    }
    const dismissHelp = useCallback(() => {
        setHelpDismissed(true)
        try {
            localStorage.setItem(HELP_KEY, '1')
        } catch {
            /* storage unavailable */
        }
    }, [])
    const openHelp = () => {
        dismissHelp()
        setHelpOpen(true)
    }

    // Start rendering the share images once the browser is idle, so the postcard
    // thumbnails show the user's haiku without waiting for the dialog.
    useEffect(() => {
        if (typeof requestIdleCallback === 'function') {
            const id = requestIdleCallback(() => setRendersIdle(true))
            return () => cancelIdleCallback(id)
        }
        const t = setTimeout(() => setRendersIdle(true), 1000)
        return () => clearTimeout(t)
    }, [])

    const refreshCount = useCallback(() => {
        countHaikus().then(setCount, () => undefined)
    }, [])
    useEffect(refreshCount, [refreshCount])

    const boxRef = useRef < HTMLDivElement > (null)
    const lineRefs = useRef < (HTMLSpanElement | null)[] > ([])

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

    const reportSave = (ok: boolean) => setSaveResult((r) => ({ ok, n: (r?.n ?? 0) + 1 }))
    const save = async (creator: string) => {
        setSaveOpen(false)
        try {
            const id = await saveHaikuToGallery(haiku, style, creator)
            setJustSavedId(id)
            // Authors upvote their own haiku. The insert policy requires upvotes = 0, so this is a second call.
            try {
                await upvoteHaiku(id)
                rememberVote(id)
            } catch {
                /* the save itself succeeded; the vote can be cast by hand */
            }
            reportSave(true)
            refreshCount()
            setPreviewKey((k) => k + 1)
        } catch {
            reportSave(false)
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
    const swapOuter = () => {
        setHistory((h) => [...h, { haiku, style }])
        bump([0, 2])
        setHaiku((h) => [h[2], h[1], h[0]])
        setStyle((s) => ({
            faces: [s.faces[2], s.faces[1], s.faces[0]],
            inks: [s.inks[2], s.inks[1], s.inks[0]],
        }))
        setLocks((l) => [l[2], l[1], l[0]])
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
            <Nav active={route} count={count} onHelp={openHelp} helpOpen={helpOpen} />
            {route === 'gallery' ? (
                <GalleryPage allPhrases={all} count={count} />
            ) : (
                <>
                    <section className="hero">
                        <h1>Tech Billboard Haiku Generator</h1>
                        <p>
                            All phrases have been taken from real AI ads displayed around the Bay Area.
                        </p>
                    </section>
                    <Steps />
                    {isMobile && !helpDismissed && <HelpCard onDismiss={dismissHelp} />}

                    <section id="app" className="app">
                        <div className="frame">
                            <div className="stage">
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
                            saveResult={saveResult}
                            onToggleLock={toggleLock}
                            onRerollFont={rerollFont}
                            onRoll={rerollEverything}
                            onUndo={undo}
                            onSwap={swapOuter}
                            onShare={() => openShare()}
                            onSave={() => setSaveOpen(true)}
                        />
                        <PostcardCard
                            onShareImage={openShare}
                            thumbs={{
                                '1a': renders['1a']?.url,
                                '1b': renders['1b']?.url,
                                '1c': renders['1c']?.url,
                                '1d': renders['1d']?.url,
                            }}
                        />
                    </section>

                    {saveOpen && <SaveDialog onSave={save} onClose={() => setSaveOpen(false)} />}
                    {shareOpen && (
                        <ShareDialog renders={renders} initialSelected={shareInitial} shareUrl={shareUrl} onClose={closeShare} />
                    )}
                    {isMobile && helpOpen && <HelpSheet onClose={closeHelp} />}
                    {artboardsOn && (
                        <div ref={artboardsRef}>
                            <Artboards haiku={haiku} style={style} />
                        </div>
                    )}

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
