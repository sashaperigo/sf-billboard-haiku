import { useLayoutEffect, useRef } from 'react'
import { TITLE_WORDS, useTitleScales } from '../lib/title'

export interface TitleLineProps {
  /** Indices into the title words shown on this line. */
  words: number[]
  /**
   * 'none' inherits the font size; 'shrink' and 'fill' size the line from a
   * 60px base to fit its parent's width, 'shrink' never growing past the base.
   */
  fit?: 'none' | 'shrink' | 'fill'
}

const BASE_PX = 60

export function TitleLine({ words, fit = 'none' }: TitleLineProps) {
  const scales = useTitleScales()
  const ref = useRef<HTMLSpanElement>(null)

  useLayoutEffect(() => {
    const el = ref.current
    const parent = el?.parentElement
    if (!el || !parent || fit === 'none') return
    const run = () => {
      el.style.fontSize = `${BASE_PX}px`
      const w = el.offsetWidth
      if (!w) return
      const ratio = parent.clientWidth / w
      const k = fit === 'shrink' ? Math.min(1, ratio) : ratio
      el.style.fontSize = `${Math.floor(BASE_PX * k * 10) / 10}px`
    }
    run()
    // Fonts settling can change widths without a resize.
    const later = setTimeout(run, 300)
    window.addEventListener('resize', run)
    return () => {
      clearTimeout(later)
      window.removeEventListener('resize', run)
    }
  }, [fit, words.join(), scales])

  return (
    <span ref={ref} className="title-line">
      {words.map((i) => {
        const w = TITLE_WORDS[i]
        return (
          <span
            key={i}
            style={{
              fontFamily: `'${w.family}', ${w.fallback}`,
              fontWeight: w.weight,
              fontStyle: w.italic ? 'italic' : 'normal',
              textTransform: w.upper ? 'uppercase' : 'none',
              letterSpacing: w.spacing,
              color: w.color,
              fontSize: `${scales[i]}em`,
            }}
          >
            {w.text}
          </span>
        )
      })}
    </span>
  )
}
