import type { Haiku } from '../lib/haiku'
import { type LineCssInput, lineCss } from '../lib/style'

export interface HaikuCardProps {
  haiku: Haiku
  style: LineCssInput
}

export function HaikuCard({ haiku, style }: HaikuCardProps) {
  return (
    <div className="gallery-card">
      {haiku.map((phrase, i) => (
        <p key={i} style={lineCss(style, i)}>
          {phrase.text}
        </p>
      ))}
    </div>
  )
}
