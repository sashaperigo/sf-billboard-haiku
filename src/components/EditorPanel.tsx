import { useEffect, useState } from 'react'
import { SwapIcon } from './icons'
import type { Haiku, Locks } from '../lib/haiku'
import { Link } from '../lib/route'
import { type LineCssInput, plainCss } from '../lib/style'
import { useMediaQuery } from '../lib/useMediaQuery'

export interface EditorPanelProps {
  haiku: Haiku
  style: LineCssInput
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

const LockIcon = ({ locked }: { locked: boolean }) => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="5" y="11" width="14" height="10" rx="2" stroke={locked ? '#8a5507' : '#14140f'} fill={locked ? '#ffe6bf' : 'none'} />
    <path d={locked ? 'M8 11V7a4 4 0 0 1 8 0v4' : 'M8 11V7a4 4 0 0 1 7.5-2'} stroke={locked ? '#8a5507' : '#14140f'} />
  </svg>
)

export function EditorPanel(p: EditorPanelProps) {
  const isMobile = useMediaQuery('(max-width: 700px)')
  return (
    <div className="editor">
      {LINES.map((i) =>
        isMobile ? (
          <div className="editor-row" key={i}>
            <div className="editor-head">
              <div className="editor-label">
                <span className="editor-line">Line {i + 1}</span>
                <span className="editor-syl"> · {SYLLABLES[i]} syllables</span>
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
              </span>
            </div>
            <span className="editor-text" style={plainCss(p.style, i, 19)}>
              {p.haiku[i].text}
            </span>
          </div>
        ) : (
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
        ),
      )}
      <div className="editor-actions">
        <SaveTag result={p.saveResult} />
        <button
          type="button"
          className="btn btn-primary roll"
          aria-label="Roll unlocked lines"
          disabled={p.locks.every(Boolean)}
          onClick={p.onRoll}
        >
          {isMobile ? (
            <>
              <span aria-hidden="true">🎲</span>
              <span aria-hidden="true">Reroll</span>
            </>
          ) : (
            'Roll unlocked lines'
          )}
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
        <button type="button" className="btn btn-secondary share" onClick={p.onShare}>
          Share
        </button>
        <button type="button" className="btn btn-amber save" onClick={p.onSave}>
          Save to gallery
        </button>
      </div>
    </div>
  )
}
