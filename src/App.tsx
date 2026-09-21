import { useState } from 'react'
import phrases from './data/phrases.json'
import {
  type Haiku,
  type Locks,
  type Phrase,
  formatShareParam,
  generateHaiku,
  parseShareParam,
  rerollAll,
  rerollLine,
} from './lib/haiku'

const all = phrases as Phrase[]
type CopyState = 'idle' | 'copied' | 'failed'
const LINES = [0, 1, 2] as const

function useCopy() {
  const [state, setState] = useState<CopyState>('idle')
  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setState('copied')
    } catch {
      setState('failed')
    }
    setTimeout(() => setState('idle'), 2000)
  }
  return [state, copy] as const
}

export default function App() {
  const [haiku, setHaiku] = useState<Haiku>(
    () =>
      parseShareParam(all, new URLSearchParams(window.location.search).get('h')) ??
      generateHaiku(all, Math.random),
  )
  const [locks, setLocks] = useState<Locks>([false, false, false])
  const [haikuState, copyHaiku] = useCopy()
  const [linkState, copyLink] = useCopy()

  const toggleLock = (i: number) =>
    setLocks((l) => l.map((v, j) => (j === i ? !v : v)) as unknown as Locks)

  const label = (s: CopyState, idle: string) =>
    s === 'copied' ? 'Copied' : s === 'failed' ? 'Copy failed' : idle

  const shareUrl = () => {
    const url = new URL(window.location.href)
    url.search = ''
    url.hash = ''
    url.searchParams.set('h', formatShareParam(haiku))
    return url.toString()
  }

  return (
    <main>
      <h1 className="visually-hidden">Haiku Generator</h1>
      <div data-testid="haiku" className="haiku" aria-live="polite">
        {LINES.map((i) => (
          <div className="line" key={i}>
            <p data-testid={`line-${i + 1}`}>{haiku[i].text}</p>
            <div className="line-controls">
              <button
                type="button"
                aria-label={`Lock line ${i + 1}`}
                aria-pressed={locks[i]}
                onClick={() => toggleLock(i)}
              >
                {locks[i] ? '🔒 Locked' : '🔓 Lock'}
              </button>
              <button
                type="button"
                aria-label={`Reroll line ${i + 1}`}
                disabled={locks[i]}
                onClick={() => setHaiku((h) => rerollLine(all, h, i, Math.random))}
              >
                Reroll
              </button>
            </div>
          </div>
        ))}
      </div>
      <div className="actions">
        <button
          type="button"
          disabled={locks.every(Boolean)}
          onClick={() => setHaiku((h) => rerollAll(all, h, locks, Math.random))}
        >
          Reroll all
        </button>
        <button type="button" onClick={() => copyHaiku(haiku.map((p) => p.text).join('\n'))}>
          {label(haikuState, 'Copy haiku')}
        </button>
        <button type="button" onClick={() => copyLink(shareUrl())}>
          {label(linkState, 'Copy link')}
        </button>
      </div>
    </main>
  )
}
