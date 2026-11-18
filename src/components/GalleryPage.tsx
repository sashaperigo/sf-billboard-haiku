import { useEffect, useRef, useState } from 'react'
import type { Phrase } from '../lib/haiku'
import { type GalleryHaiku, type GallerySort, fetchGalleryPage } from '../lib/gallery'
import { getJustSaved } from '../lib/justSaved'
import { Link } from '../lib/route'
import { useMediaQuery } from '../lib/useMediaQuery'
import { useVoting } from '../lib/useVoting'
import { GalleryCard } from './GalleryCard'

export interface GalleryPageProps {
  allPhrases: Phrase[]
  /** Total haikus saved, or null while unknown. */
  count: number | null
}

const SORTS: { value: GallerySort; label: string }[] = [
  { value: 'top', label: 'Top' },
  { value: 'new', label: 'New' },
]

export function GalleryPage({ allPhrases, count }: GalleryPageProps) {
  const isMobile = useMediaQuery('(max-width: 700px)')
  const [sort, setSort] = useState<GallerySort>('top')
  const [items, setItems] = useState<GalleryHaiku[]>([])
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const { votedIds, toggleVote } = useVoting(setItems, setError)
  const [justSaved] = useState(getJustSaved)
  const [justSavedId, setJustSavedId] = useState(justSaved?.id ?? null)
  const latest = useRef(0)

  const loadPage = async (offset: number, forSort: GallerySort) => {
    const request = ++latest.current
    setLoading(true)
    try {
      const { items: page, hasMore: more } = await fetchGalleryPage(allPhrases, offset, { sort: forSort })
      if (request !== latest.current) return
      setItems((prev) => (offset === 0 ? page : [...prev, ...page]))
      setHasMore(more)
      setError('')
    } catch {
      if (request !== latest.current) return
      setError("Couldn't load the gallery.")
    } finally {
      if (request === latest.current) setLoading(false)
    }
  }

  useEffect(() => {
    if (!justSaved) return
    const timer = setTimeout(() => setJustSavedId(null), justSaved.remaining)
    return () => clearTimeout(timer)
  }, [justSaved])

  useEffect(() => {
    setItems([])
    setHasMore(false)
    loadPage(0, sort)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sort])

  const total = count === null ? 'Haikus' : `${count} haikus`
  const makeYourOwn = (
    <Link to="/" className="btn btn-amber make-your-own">
      Make your own
    </Link>
  )

  return (
    <main className="gallery-page">
      <header className="gallery-head">
        <div>
          <h1>The gallery</h1>
          <p>
            {isMobile
              ? `${total} saved by visitors. Upvote your favorites.`
              : `${total} made from real Bay Area AI billboards and saved by visitors. Upvote your favorites, one vote per haiku.`}
          </p>
        </div>
        {!isMobile && makeYourOwn}
      </header>

      <div className="gallery-toolbar">
        <div className="segmented" role="group" aria-label="Sort haikus">
          {SORTS.map((s) => (
            <button key={s.value} type="button" aria-pressed={sort === s.value} onClick={() => setSort(s.value)}>
              {s.label}
            </button>
          ))}
        </div>
        {count !== null && <span className="gallery-total">{count} haikus</span>}
      </div>

      <div className="gallery-results">
        {error && (
          <p className="gallery-status" role="status">
            {error}
          </p>
        )}

        {!loading && items.length === 0 && !error && <p>No haikus yet — be the first to save one!</p>}

        <div className="gallery-grid">
          {items.map((item) => (
            <GalleryCard
              key={item.id}
              item={item}
              voted={votedIds.has(item.id)}
              yours={item.id === justSavedId}
              scale={isMobile ? 1 : 0.9}
              onToggleVote={toggleVote}
            />
          ))}
        </div>

        {hasMore && (
          <button
            type="button"
            className="gallery-load-more"
            disabled={loading}
            onClick={() => loadPage(items.length, sort)}
          >
            Load more
          </button>
        )}
        {isMobile && makeYourOwn}
      </div>
    </main>
  )
}
