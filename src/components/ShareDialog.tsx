import { useCallback, useEffect, useRef, useState } from 'react'
import billboard from '../assets/billboard.png'
import dayBillboard from '../assets/day-billboard.jpg'
import nightBillboard from '../assets/night-billboard.jpg'
import sutroBlank from '../assets/sutro-blank.jpeg'
import type { Haiku } from '../lib/haiku'
import {
    PAPER_H,
    PAPER_W,
    QUADS,
    SHARE_H,
    SHARE_OPTIONS,
    SHARE_W,
    type ShareId,
    quadMatrix,
    renderArtboard,
    shareFileName,
} from '../lib/shareImage'
import { FACES, type LineCssInput, lineCss } from '../lib/style'

export interface ShareDialogProps {
    haiku: Haiku
    style: LineCssInput
    shareUrl: () => string
    onClose: () => void
}

const BASE = [1, 0.875, 1]
const SELECTED_DEFAULT: ShareId = '1b'

const lineStyle = (style: LineCssInput, i: number): React.CSSProperties => ({
    ...lineCss(style, i),
    fontSize: `${BASE[i] * FACES[style.faces[i]].size}em`,
    whiteSpace: 'nowrap',
    display: 'block',
    transformOrigin: 'center',
    lineHeight: 1.2,
    opacity: 0.92,
    mixBlendMode: 'multiply',
})

const boxStyle: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    padding: '20px 40px',
    textAlign: 'center',
}

const captionStyle: React.CSSProperties = {
    position: 'absolute',
    right: 30,
    bottom: 26,
    fontFamily: "'Open Sans', sans-serif",
    fontStyle: 'italic',
    fontWeight: 400,
    fontSize: 30,
    color: '#fff',
    textShadow: '0 0 5px rgba(0,0,0,0.6)',
}

const artboardStyle = (background: string): React.CSSProperties => ({
    position: 'relative',
    width: SHARE_W,
    height: SHARE_H,
    overflow: 'hidden',
    background,
})

const photoStyle = (top: number, height: number, width: number, left = 0): React.CSSProperties => ({
    position: 'absolute',
    left,
    top,
    width,
    height,
    maxWidth: 'none',
})

function Artboards({ haiku, style }: { haiku: Haiku; style: LineCssInput }) {
    const box = (
        <div data-box="" style={boxStyle}>
            {[0, 1, 2].map((i) => (
                <span key={i} data-line="" style={lineStyle(style, i)}>
                    {haiku[i].text}
                </span>
            ))}
        </div>
    )
    const paper = (kind: 'day' | 'night') => (
        <div
            data-board={kind}
            data-quad={QUADS[kind].join(',')}
            style={{
                position: 'absolute',
                left: 0,
                top: 0,
                width: PAPER_W,
                height: PAPER_H,
                transformOrigin: '0 0',
                transform: quadMatrix(PAPER_W, PAPER_H, QUADS[kind]),
                fontSize: 46,
            }}
        >
            {box}
        </div>
    )
    const caption = (
        <div data-k="caption" style={captionStyle}>
            haiku.guru
        </div>
    )
    return (
        <div aria-hidden="true" style={{ position: 'fixed', left: -99999, top: 0 }}>
            <div
                data-artboard="1a"
                style={{
                    ...artboardStyle('#faf9f5'),
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 44,
                    padding: 48,
                }}
            >
                <div data-k="photo" style={{ position: 'relative', width: 984, height: 655, borderRadius: 12, overflow: 'hidden', background: '#0d1116' }}>
                    <img src={billboard} alt="" style={{ display: 'block', width: '100%', height: '100%' }} />
                    <div
                        data-board="none"
                        style={{ position: 'absolute', left: '9.3%', top: '4.6%', width: '85.9%', height: '37.1%', transform: 'rotate(-0.28deg)', fontSize: 42 }}
                    >
                        {box}
                    </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                    <div data-k="text" style={{ fontFamily: "'Open Sans', sans-serif", fontSize: 24, color: 'rgba(20,19,14,0.6)' }}>
                        Write your own 5-7-5 at
                    </div>
                    <div data-k="text" style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 600, fontSize: 34, color: '#b5730a' }}>
                        haiku.guru
                    </div>
                </div>
            </div>

            <div data-artboard="1b" style={artboardStyle('#8aa2bb')}>
                <img src={sutroBlank} alt="" style={photoStyle(0, 1350, 2024, -267)} />
                <div data-board="sutro" style={{ position: 'absolute', left: 66, top: 620, width: 948, height: 317, fontSize: 44 }}>
                    {box}
                </div>
                {caption}
            </div>

            <div data-artboard="1c" style={artboardStyle('#c3d3e6')}>
                <img src={dayBillboard} alt="" style={photoStyle(-111, 1512, 1080)} />
                {paper('day')}
                {caption}
            </div>

            <div data-artboard="1d" style={artboardStyle('#0b0606')}>
                <img src={nightBillboard} alt="" style={photoStyle(-45, 1440, 1080)} />
                {paper('night')}
                {caption}
            </div>
        </div>
    )
}

interface Render {
    blob: Blob
    url: string
}

export function ShareDialog({ haiku, style, shareUrl, onClose }: ShareDialogProps) {
    const rootRef = useRef<HTMLDivElement>(null)
    const [selected, setSelected] = useState<ShareId>(SELECTED_DEFAULT)
    const [renders, setRenders] = useState<Partial<Record<ShareId, Render>>>({})
    const [status, setStatus] = useState('')
    const urls = useRef<Partial<Record<ShareId, string>>>({})
    const busy = useRef(false)
    const again = useRef(false)
    const alive = useRef(true)
    const statusTimer = useRef<ReturnType<typeof setTimeout>>(undefined)

    const renderAll = useCallback(async () => {
        if (busy.current) {
            again.current = true
            return
        }
        busy.current = true
        try {
            for (const { id } of SHARE_OPTIONS) {
                const ab = rootRef.current?.querySelector<HTMLElement>(`[data-artboard="${id}"]`)
                if (!ab || !alive.current) continue
                try {
                    await new Promise((r) => setTimeout(r, 0))
                    const blob = await renderArtboard(ab)
                    if (!alive.current) break
                    const url = URL.createObjectURL(blob)
                    if (urls.current[id]) URL.revokeObjectURL(urls.current[id]!)
                    urls.current[id] = url
                    setRenders((r) => ({ ...r, [id]: { blob, url } }))
                } catch (e) {
                    console.error('share render failed', id, e)
                }
            }
        } finally {
            busy.current = false
        }
        if (again.current && alive.current) {
            again.current = false
            void renderAll()
        }
    }, [])

    // Render on open and whenever the haiku or style changes.
    useEffect(() => {
        void renderAll()
    }, [renderAll, haiku, style])

    useEffect(() => {
        alive.current = true
        const held = urls.current
        return () => {
            alive.current = false
            clearTimeout(statusTimer.current)
            Object.values(held).forEach((u) => u && URL.revokeObjectURL(u))
        }
    }, [])

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [onClose])

    const current: ShareId = renders[selected] ? selected : (SHARE_OPTIONS.find((o) => renders[o.id])?.id ?? selected)
    const flash = (msg: string) => {
        setStatus(msg)
        clearTimeout(statusTimer.current)
        statusTimer.current = setTimeout(() => setStatus(''), 2000)
    }
    const download = () => {
        const r = renders[current]
        if (!r) return flash('still rendering')
        const a = document.createElement('a')
        a.href = r.url
        a.download = shareFileName(current)
        a.click()
        flash('downloaded')
    }
    const share = async () => {
        const r = renders[current]
        if (!r) return flash('still rendering')
        const file = new File([r.blob], shareFileName(current), { type: 'image/png' })
        if (navigator.canShare?.({ files: [file] })) {
            try {
                await navigator.share({ files: [file] })
            } catch {
                /* cancelled */
            }
        } else download()
    }

    const copyLink = async () => {
        try {
            await navigator.clipboard.writeText(shareUrl())
            flash('link copied')
        } catch {
            flash('copy failed')
        }
    }

    const preview = renders[current]
    return (
        <>
        <div className="share-scrim" onClick={onClose}>
            <div
                className="share-dialog"
                role="dialog"
                aria-modal="true"
                aria-labelledby="share-title"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="share-preview">
                    {preview ? (
                        <div role="img" aria-label="Selected share image" style={{ backgroundImage: `url(${preview.url})` }} />
                    ) : (
                        <span>Rendering…</span>
                    )}
                </div>
                <div className="share-side">
                    <div className="share-head">
                        <div>
                            <h2 id="share-title">Share your haiku</h2>
                            <p>Pick a billboard. Images are 1080 × 1350, sized for social feeds.</p>
                        </div>
                        <button type="button" className="pill share-close" aria-label="Close" onClick={onClose}>
                            ×
                        </button>
                    </div>
                    <div className="share-options">
                        {SHARE_OPTIONS.map((o) => (
                            <button
                                key={o.id}
                                type="button"
                                className="share-tile"
                                aria-pressed={current === o.id}
                                onClick={() => setSelected(o.id)}
                            >
                                <div className="share-thumb">
                                    {renders[o.id] && (
                                        <div role="img" aria-label={o.label} style={{ backgroundImage: `url(${renders[o.id]!.url})` }} />
                                    )}
                                </div>
                                <span>{o.label}</span>
                            </button>
                        ))}
                    </div>
                    <div className="share-actions">
                        <button type="button" className="btn btn-primary" onClick={download}>
                            Download PNG
                        </button>
                        <button type="button" className="btn" onClick={share}>
                            Share…
                        </button>
                        <button type="button" className="btn" onClick={copyLink}>
                            Copy link
                        </button>
                        <span className="status" role="status">
                            {status}
                        </span>
                    </div>
                </div>
            </div>
            </div>
            <div ref={rootRef}>
                <Artboards haiku={haiku} style={style} />
            </div>
        </>
    )
}
