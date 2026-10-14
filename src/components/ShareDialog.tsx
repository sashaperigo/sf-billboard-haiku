import { useEffect, useRef, useState } from 'react'
import { SHARE_OPTIONS, type ShareId, shareFileName } from '../lib/shareImage'
import type { ShareRenders } from '../lib/useShareRenders'
import { DownloadIcon, LinkIcon, MoreIcon } from './icons'

export interface ShareDialogProps {
    renders: ShareRenders
    initialSelected?: ShareId
    shareUrl: () => string
    onClose: () => void
}

const SELECTED_DEFAULT: ShareId = '1b'

export function ShareDialog({ renders, initialSelected, shareUrl, onClose }: ShareDialogProps) {
    const [selected, setSelected] = useState<ShareId>(initialSelected ?? SELECTED_DEFAULT)
    const [status, setStatus] = useState('')
    const statusTimer = useRef<ReturnType<typeof setTimeout>>(undefined)

    useEffect(() => () => clearTimeout(statusTimer.current), [])

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
        try {
            await navigator.share({ files: [file] })
        } catch {
            /* cancelled */
        }
    }
    const canShareFiles = !!navigator.canShare?.({ files: [new File([], 'x.png', { type: 'image/png' })] })

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
                        <button type="button" className="share-action" onClick={download}>
                            <span className="share-action-icon"><DownloadIcon /></span>
                            Save image
                        </button>
                        <button type="button" className="share-action" onClick={copyLink}>
                            <span className="share-action-icon"><LinkIcon /></span>
                            Copy link
                        </button>
                        {canShareFiles && (
                            <button type="button" className="share-action" onClick={share}>
                                <span className="share-action-icon"><MoreIcon /></span>
                                More…
                            </button>
                        )}
                        <span className="status" role="status">
                            {status}
                        </span>
                    </div>
                </div>
            </div>
            </div>
        </>
    )
}
