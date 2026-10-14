import { useEffect, useRef } from 'react'
import { STEPS } from './Steps'

function HelpSteps() {
  return (
    <ol className="help-steps">
      {STEPS.map((s, i) => (
        <li key={s.title} className="step">
          <span className="step-num" data-step={i + 1} aria-hidden="true">
            {i + 1}
          </span>
          <div>
            <strong>{s.title}</strong>
            <p>{s.desc}</p>
          </div>
        </li>
      ))}
    </ol>
  )
}

/** First-visit card shown between the hero and the billboard on mobile. */
export function HelpCard({ onDismiss }: { onDismiss: () => void }) {
  return (
    <section className="help-card" aria-labelledby="help-card-title">
      <div className="help-head">
        <h2 id="help-card-title">How it works</h2>
        <button type="button" className="help-close" aria-label="Dismiss" onClick={onDismiss}>
          ×
        </button>
      </div>
      <HelpSteps />
      <button type="button" className="btn btn-primary help-gotit" onClick={onDismiss}>
        Got it
      </button>
    </section>
  )
}

const SWIPE_CLOSE_PX = 60

/** Bottom sheet opened by the nav ? button. */
export function HelpSheet({ onClose }: { onClose: () => void }) {
  const startY = useRef<number | null>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="help-scrim" onClick={onClose}>
      <div
        className="help-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="help-sheet-title"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={(e) => {
          startY.current = e.touches[0].clientY
        }}
        onTouchEnd={(e) => {
          if (startY.current !== null && e.changedTouches[0].clientY - startY.current > SWIPE_CLOSE_PX) onClose()
          startY.current = null
        }}
      >
        <div className="help-grab" aria-hidden="true" />
        <div className="help-head">
          <h2 id="help-sheet-title">How it works</h2>
          <button type="button" className="pill help-sheet-close" aria-label="Close" onClick={onClose}>
            ×
          </button>
        </div>
        <HelpSteps />
      </div>
    </div>
  )
}
