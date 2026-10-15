import { useEffect, useState } from 'react'
import { FACES, INKS } from './style'

export interface TitleWord {
  text: string
  family: string
  fallback: string
  weight: number
  italic: boolean
  upper: boolean
  spacing: string
  color: string
  /** Placeholder size multiplier, used until the real one is measured. */
  size: number
}

/** Title words in order, each set in one of the app's billboard faces. */
const SPEC: [text: string, family: string, fallback: string, ink: string][] = [
  ['Tech', 'Archivo Black', '"Arial Black", sans-serif', '#00845c'],
  ['Billboard', 'Instrument Serif', 'Georgia, serif', '#e01020'],
  ['Haiku', 'Bebas Neue', 'Impact, sans-serif', '#0047ff'],
  ['Generator', 'Space Mono', 'Menlo, Courier, monospace', '#7b2ff7'],
]

export const TITLE_WORDS: TitleWord[] = SPEC.map(([text, family, fallback, ink]) => {
  const face = FACES.find((f) => f.family === family)!
  return {
    text,
    family,
    fallback,
    weight: face.weight,
    italic: face.italic,
    upper: face.upper,
    spacing: face.spacing,
    color: INKS.find((c) => c === ink)!,
    size: face.size,
  }
})

export const TITLE_TEXT = TITLE_WORDS.map((w) => w.text).join(' ')

/** Height of the letters above the baseline, in em of the title's base size. */
const TARGET_ASCENT = 0.74

const fontShorthand = (w: TitleWord, px: number) =>
  `${w.italic ? 'italic' : 'normal'} ${w.weight} ${px}px '${w.family}', ${w.fallback}`

const PLACEHOLDER = TITLE_WORDS.map((w) => w.size)

let measured: Promise<number[]> | null = null

/** Per-word font-size multipliers that give every word the same ascent height. */
export function measureTitleScales(): Promise<number[]> {
  measured ??= (async () => {
    // A failed load is fine: measuring then uses the fallback family.
    await Promise.allSettled(
      TITLE_WORDS.map((w) => document.fonts?.load(fontShorthand(w, 100), w.text)),
    )
    const ctx = document.createElement('canvas').getContext('2d')
    if (!ctx) return PLACEHOLDER
    return TITLE_WORDS.map((w) => {
      ctx.font = fontShorthand(w, 100)
      const ascent = ctx.measureText(w.upper ? w.text.toUpperCase() : w.text).actualBoundingBoxAscent / 100
      return ascent > 0 ? TARGET_ASCENT / ascent : w.size
    })
  })()
  return measured
}

export function useTitleScales(): number[] {
  const [scales, setScales] = useState(PLACEHOLDER)
  useEffect(() => {
    let live = true
    void measureTitleScales().then((s) => live && setScales(s))
    return () => {
      live = false
    }
  }, [])
  return scales
}

/**
 * True while the element is far enough on screen for the nav wordmark to stay
 * hidden: its bottom edge is more than the nav plus 35% of its height below the top.
 */
export function useHeroVisible(ref: React.RefObject<HTMLElement | null>, navHeight: number, enabled: boolean) {
  const [visible, setVisible] = useState(true)
  useEffect(() => {
    if (!enabled) return
    const check = () => {
      const r = ref.current?.getBoundingClientRect()
      if (r) setVisible(r.bottom > navHeight + 0.35 * r.height)
    }
    check()
    window.addEventListener('scroll', check, { passive: true })
    window.addEventListener('resize', check)
    return () => {
      window.removeEventListener('scroll', check)
      window.removeEventListener('resize', check)
    }
  }, [ref, navHeight, enabled])
  return visible
}
