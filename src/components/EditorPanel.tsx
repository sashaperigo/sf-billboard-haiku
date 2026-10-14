import { DownloadIcon, SwapIcon } from './icons'
import type { Haiku, Locks } from '../lib/haiku'
import { SHARE_OPTIONS, type ShareId } from '../lib/shareImage'
import { type LineCssInput, plainCss } from '../lib/style'

export interface EditorPanelProps {
  haiku: Haiku
  style: LineCssInput
  locks: Locks
  canUndo: boolean
  status: string
  onToggleLock: (i: number) => void
  onRerollFont: (i: number) => void
  onRoll: () => void
  onUndo: () => void
  onSwap: () => void
  onShare: () => void
  /** Opens the share dialog, optionally on a specific backdrop. */
  onShareImage: (id?: ShareId) => void
  /** Rendered share image URLs; thumbnails fall back to the raw photos until ready. */
  thumbs: Partial<Record<ShareId, string>>
  onSave: () => void
}

const LINES = [0, 1, 2] as const
const SYLLABLES = [5, 7, 5]

export function EditorPanel(p: EditorPanelProps) {
  return (
    <div className="editor">
      {LINES.map((i) => (
        <div className="editor-row" key={i}>
          <div className="editor-label">
            <span className="editor-line">Line {i + 1}</span>
            <span className="editor-syl">{SYLLABLES[i]} syllables</span>
          </div>
          <span className="editor-text" style={plainCss(p.style, i, 19)}>
            {p.haiku[i].text}
          </span>
          <button
            type="button"
            className="pill pill-font"
            aria-label={`New font for line ${i + 1}`}
            onClick={() => p.onRerollFont(i)}
          >
            <span className="aa" aria-hidden="true">
              Aa
            </span>{' '}
            New font
          </button>
          <button
            type="button"
            className="pill pill-lock"
            aria-label={`Lock line ${i + 1}`}
            aria-pressed={p.locks[i]}
            onClick={() => p.onToggleLock(i)}
          >
            {p.locks[i] ? 'Locked' : 'Lock'}
          </button>
        </div>
      ))}
      <div className="editor-actions">
        <button type="button" className="btn btn-primary roll" disabled={p.locks.every(Boolean)} onClick={p.onRoll}>
          Roll unlocked lines
        </button>
        <button type="button" className="btn btn-secondary undo" disabled={!p.canUndo} onClick={p.onUndo}>
          Undo
        </button>
        <button
          type="button"
          className="btn btn-secondary swap"
          aria-label="Swap lines 1 and 3"
          title="Swap lines 1 and 3"
          onClick={p.onSwap}
        >
          <SwapIcon /> Swap
        </button>
        <span className="status" role="status">
          {p.status}
        </span>
        <button type="button" className="btn btn-secondary share" onClick={p.onShare}>
          Share
        </button>
        <button type="button" className="btn btn-amber save" onClick={p.onSave}>
          Save to gallery
        </button>
      </div>
      <div className="postcard">
        <div className="postcard-text">
          <strong>Download it as a postcard</strong>
          <span>Your haiku on four real billboards, sized for Instagram.</span>
        </div>
        <div className="postcard-thumbs">
          {SHARE_OPTIONS.map((o) => (
            <button
              key={o.id}
              type="button"
              className="postcard-thumb"
              data-id={o.id}
              aria-label={`Download ${o.label} image`}
              style={p.thumbs[o.id] ? { background: `url(${p.thumbs[o.id]}) center/cover` } : undefined}
              onClick={() => p.onShareImage(o.id)}
            />
          ))}
        </div>
        <button type="button" className="btn postcard-get" onClick={() => p.onShareImage()}>
          <DownloadIcon /> Get images
        </button>
      </div>
    </div>
  )
}
