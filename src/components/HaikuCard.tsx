import type { Haiku } from '../lib/haiku'
import { type Style, plainCss } from '../lib/style'

export interface HaikuCardProps {
  haiku: Haiku
  style: Style
  /** Multiplier on the base type size (the gallery page uses a slightly smaller one). */
  scale?: number
}

const BASE_PX = [19, 17, 19]

export function HaikuCard({ haiku, style, scale = 1 }: HaikuCardProps) {
  return (
    <div className="haiku-lines">
      {haiku.map((phrase, i) => (
        <p key={i} style={plainCss(style, i, BASE_PX[i] * scale)}>
          {phrase.text}
        </p>
      ))}
    </div>
  )
}
