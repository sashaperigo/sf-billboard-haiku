import { useEffect, useState } from 'react'
import { ShareIcon, SwapIcon, UndoIcon } from './icons'
import type { Haiku, Locks } from '../lib/haiku'
import { Link } from '../lib/route'
import { type Style, plainCss } from '../lib/style'
import { useMediaQuery } from '../lib/useMediaQuery'

export interface EditorPanelProps {
  haiku: Haiku
  style: Style
  locks: Locks
  canUndo: boolean
  /** Outcome of the last save; `n` changes on every attempt so the tag re-appears. */
  saveResult: { ok: boolean; n: number } | null
  onToggleLock: (i: number) => void
  onRerollFont: (i: number) => void
  onRoll: () => void
  onUndo: () => void
  onSwap: () => void
  onShare: () => void
  onSave: () => void
}

const LINES = [0, 1, 2] as const
const SYLLABLES = [5, 7, 5]

const SAVE_TAG_MS = 3000

function SaveTag({ result }: { result: EditorPanelProps['saveResult'] }) {
  const [shown, setShown] = useState(false)
  const [hovered, setHovered] = useState(false)
  // Hovering holds the tag open; leaving restarts the countdown.
  useEffect(() => {
    if (!result) return
    setShown(true)
    if (hovered) return
    const t = setTimeout(() => setShown(false), SAVE_TAG_MS)
    return () => clearTimeout(t)
  }, [result, hovered])
  return (
    <div
      className="save-tag"
      role="status"
      aria-live="polite"
      data-visible={shown || undefined}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {result?.ok && (
        <>
          <span className="save-tag-check" aria-hidden="true">
            ✓
          </span>
          <span className="save-tag-msg">Saved to gallery</span>
          <Link to="/gallery" className="save-tag-link">
            View →
          </Link>
        </>
      )}
      {result && !result.ok && <span className="save-tag-msg">Save failed</span>}
    </div>
  )
}

const MUTED = 'rgba(20,19,14,0.45)'

const LockIcon = ({ locked }: { locked: boolean }) => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="5" y="11" width="14" height="10" rx="2" stroke={locked ? '#8a5507' : MUTED} fill={locked ? '#ffe6bf' : 'none'} />
    <path d={locked ? 'M8 11V7a4 4 0 0 1 8 0v4' : 'M8 11V7a4 4 0 0 1 7.5-2'} stroke={locked ? '#8a5507' : MUTED} />
  </svg>
)

export function EditorPanel(p: EditorPanelProps) {
  const isMobile = useMediaQuery('(max-width: 700px)')
  return (
    <div className="editor">
      {LINES.map((i) => (
        <div className="editor-row" key={i}>
          <div className="editor-head">
            <div className="editor-label">
              <span className="editor-line">Line {i + 1}</span>
              <span className="editor-syl">
                {isMobile ? ' · ' : ''}
                {SYLLABLES[i]} syllables
              </span>
            </div>
            <span className="icon-wrap">
              <button
                type="button"
                className="icon-btn"
                aria-label={`New font for line ${i + 1}`}
                onClick={() => p.onRerollFont(i)}
              >
                <span className="aa" aria-hidden="true">
                  Aa
                </span>
              </button>
              <span className="icon-tip" aria-hidden="true">
                Change font
              </span>
            </span>
            <span className="icon-wrap">
              <button
                type="button"
                className="icon-btn"
                aria-label={`Lock line ${i + 1}`}
                aria-pressed={p.locks[i]}
                onClick={() => p.onToggleLock(i)}
              >
                <LockIcon locked={p.locks[i]} />
              </button>
              <span className="icon-tip" aria-hidden="true">
                {p.locks[i] ? 'Unlock row' : 'Lock row'}
              </span>
            </span>
          </div>
          <span className="editor-text" style={plainCss(p.style, i, 19)}>
            {p.haiku[i].text}
          </span>
        </div>
      ))}
      <div className="editor-actions">
        <SaveTag result={p.saveResult} />
        <button
          type="button"
          className="btn btn-primary roll"
          aria-label="Roll unlocked lines"
          disabled={p.locks.every(Boolean)}
          onClick={p.onRoll}
        >
          <span aria-hidden="true">🎲</span>
          <span aria-hidden="true">Reroll</span>
        </button>
        <span className="icon-wrap">
          <button type="button" className="btn btn-tint undo" aria-label="Undo" disabled={!p.canUndo} onClick={p.onUndo}>
            <UndoIcon />
          </button>
          <span className="icon-tip icon-tip-up" aria-hidden="true">
            Undo
          </span>
        </span>
        <span className="icon-wrap">
          <button type="button" className="btn btn-tint swap" aria-label="Swap lines 1 and 3" onClick={p.onSwap}>
            <SwapIcon />
          </button>
          <span className="icon-tip icon-tip-up" aria-hidden="true">
            Swap lines 1 and 3
          </span>
        </span>
        <span className="icon-wrap share">
          <button type="button" className="btn btn-tint" aria-label="Share" onClick={p.onShare}>
            <ShareIcon />
          </button>
          <span className="icon-tip icon-tip-up" aria-hidden="true">
            Share
          </span>
        </span>
        <button type="button" className="btn btn-amber save" onClick={p.onSave}>
          Save to gallery
        </button>
      </div>
    </div>
  )
}
