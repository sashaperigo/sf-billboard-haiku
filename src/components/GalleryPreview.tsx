import { useEffect, useState } from 'react'
import { type GalleryHaiku, fetchGalleryPage } from '../lib/gallery'
import type { Phrase } from '../lib/haiku'
import { Link } from '../lib/route'
import { useMediaQuery } from '../lib/useMediaQuery'
import { useVoting } from '../lib/useVoting'
import { GalleryCard } from './GalleryCard'

export interface GalleryPreviewProps {
  allPhrases: Phrase[]
  count: number | null
  /** Bump to refetch (e.g. after saving a haiku). */
  refreshKey: number
}

export function GalleryPreview({ allPhrases, count, refreshKey }: GalleryPreviewProps) {
  const isMobile = useMediaQuery('(max-width: 700px)')
  const [items, setItems] = useState<GalleryHaiku[]>([])
  const [failed, setFailed] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const { votedIds, toggleVote } = useVoting(setItems, () => {})

  useEffect(() => {
    let live = true
    fetchGalleryPage(allPhrases, 0, { sort: 'top', limit: 3 })
      .then(({ items: page }) => {
        if (!live) return
        setItems(page)
        setFailed(false)
      })
      .catch(() => live && setFailed(true))
      .finally(() => live && setLoaded(true))
    return () => {
      live = false
    }
  }, [allPhrases, refreshKey])

  if (failed || !loaded) return null

    return (
    <section className="preview" aria-labelledby="preview-title">
      <div className="preview-inner">
        <div className="preview-head">
          <div>
            <h2 id="preview-title">From the gallery</h2>
            <p>
              {count === null
                ? 'The most upvoted haikus saved by visitors.'
                : isMobile
                  ? `The most upvoted of ${count} saved haikus.`
                  : `The most upvoted of ${count} haikus saved by visitors.`}
            </p>
          </div>
          {!isMobile && (
            <Link to="/gallery" className="preview-all">
              View all →
            </Link>
          )}
        </div>
        {items.length === 0 ? (
          <p>No haikus yet — be the first to save one!</p>
        ) : (
          <div className="preview-grid">
            {items.map((item) => (
              <GalleryCard key={item.id} item={item} voted={votedIds.has(item.id)} onToggleVote={toggleVote} />
            ))}
          </div>
        )}
        <Link to="/gallery" className="btn btn-primary preview-cta">
          View full gallery {count !== null && <span className="preview-cta-count">{count} </span>}→
        </Link>
      </div>
    </section>
  )
}
