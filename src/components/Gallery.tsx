import { useEffect, useState } from 'react'
import type { Phrase } from '../lib/haiku'
import { type GalleryHaiku, fetchGalleryPage, upvoteHaiku } from '../lib/gallery'
import { BackIcon, UpvoteIcon } from './icons'
import { HaikuCard } from './HaikuCard'

export interface GalleryProps {
  allPhrases: Phrase[]
  onBack: () => void
}

const VOTED_KEY = 'votedHaikuIds'

function loadVotedIds(): Set<string> {
  try {
    const raw = localStorage.getItem(VOTED_KEY)
    return new Set(raw ? (JSON.parse(raw) as string[]) : [])
  } catch {
    return new Set()
  }
}

function saveVotedIds(ids: Set<string>) {
  try {
    localStorage.setItem(VOTED_KEY, JSON.stringify([...ids]))
  } catch {
    // localStorage unavailable (private mode, quota, etc.) — voting still
    // works for this page view, it just won't be remembered next time.
  }
}

export function Gallery({ allPhrases, onBack }: GalleryProps) {
  const [items, setItems] = useState<GalleryHaiku[]>([])
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [votedIds, setVotedIds] = useState<Set<string>>(() => loadVotedIds())

  const loadPage = async (offset: number) => {
    setLoading(true)
    try {
      const { items: page, hasMore: more } = await fetchGalleryPage(allPhrases, offset)
      setItems((prev) => (offset === 0 ? page : [...prev, ...page]))
      setHasMore(more)
      setError('')
    } catch {
      setError("Couldn't load the gallery.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPage(0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleUpvote = async (id: string) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, upvotes: item.upvotes + 1 } : item)))
    setVotedIds((prev) => {
      const next = new Set(prev)
      next.add(id)
      saveVotedIds(next)
      return next
    })
    try {
      await upvoteHaiku(id)
    } catch {
      setItems((prev) => prev.map((item) => (item.id === id ? { ...item, upvotes: item.upvotes - 1 } : item)))
      setVotedIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        saveVotedIds(next)
        return next
      })
      setError('Upvote failed — try again.')
    }
  }

  return (
    <div className="gallery">
      <div className="gallery-header">
        <button type="button" className="circle" aria-label="Back to editor" data-tip="Back to editor" onClick={onBack}>
          <BackIcon />
        </button>
        <h1>Gallery</h1>
      </div>

      {error && (
        <p className="gallery-status" role="status">
          {error}
        </p>
      )}

      {!loading && items.length === 0 && !error && <p>No haikus yet — be the first to save one!</p>}

      <div className="gallery-grid">
        {items.map((item) => {
          const voted = votedIds.has(item.id)
          return (
            <div className="gallery-item" key={item.id}>
              <HaikuCard haiku={item.haiku} style={item.style} />
              <button
                type="button"
                className="circle action upvote"
                aria-label={voted ? 'Already upvoted' : 'Upvote this haiku'}
                aria-pressed={voted}
                data-tip={voted ? 'You upvoted this' : 'Upvote'}
                disabled={voted}
                onClick={() => handleUpvote(item.id)}
              >
                <UpvoteIcon />
                <span className="upvote-count">{item.upvotes}</span>
              </button>
            </div>
          )
        })}
      </div>

      {hasMore && (
        <button
          type="button"
          className="gallery-load-more"
          disabled={loading}
          onClick={() => loadPage(items.length)}
        >
          Load more
        </button>
      )}
    </div>
  )
}
