import { render, screen } from '@testing-library/react'
import type { Phrase } from '../lib/haiku'
import { FACES, INKS } from '../lib/style'
import { HaikuCard } from './HaikuCard'

const phrase = (text: string, syllables: 5 | 7): Phrase => ({ id: text, text, syllables })
const haiku = [phrase('line one', 5), phrase('line two', 7), phrase('line three', 5)] as const as [
  Phrase,
  Phrase,
  Phrase,
]

describe('HaikuCard', () => {
  it('renders the three lines of text', () => {
    render(<HaikuCard haiku={haiku} style={{ faces: [0, 1, 2], inks: [0, 1, 2] }} />)
    expect(screen.getByText('line one')).toBeInTheDocument()
    expect(screen.getByText('line two')).toBeInTheDocument()
    expect(screen.getByText('line three')).toBeInTheDocument()
  })

  it('applies the chosen face and ink to each line', () => {
    render(<HaikuCard haiku={haiku} style={{ faces: [3, 10, 20], inks: [1, 2, 3] }} />)
    const line1 = screen.getByText('line one')
    expect(line1).toHaveStyle({ fontFamily: `'${FACES[3].family}', ${FACES[3].fallback}` })
    expect(line1).toHaveStyle({ color: INKS[1] })
  })
})
