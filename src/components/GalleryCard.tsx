import type { GalleryHaiku } from '../lib/gallery'
import { HaikuCard } from './HaikuCard'
import { UpvoteIcon } from './icons'

export interface GalleryCardProps {
  item: GalleryHaiku
  voted: boolean
  yours?: boolean
  scale?: number
  onUpvote: (id: string) => void
}

export function GalleryCard({ item, voted, yours, scale, onUpvote }: GalleryCardProps) {
  return (
    <div className="gallery-card">
      {yours && <span className="yours-tag">Yours · just saved</span>}
      <HaikuCard haiku={item.haiku} style={item.style} scale={scale} />
      <button
        type="button"
        className="upvote"
        aria-label={voted ? 'Already upvoted' : 'Upvote this haiku'}
        aria-pressed={voted}
        disabled={voted}
        onClick={() => onUpvote(item.id)}
      >
        <UpvoteIcon />
        <span className="upvote-count">{item.upvotes}</span>
      </button>
    </div>
  )
}
