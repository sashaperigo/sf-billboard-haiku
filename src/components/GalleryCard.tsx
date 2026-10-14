import type { GalleryHaiku } from '../lib/gallery'
import { HaikuCard } from './HaikuCard'
import { UpvoteIcon } from './icons'

export interface GalleryCardProps {
  item: GalleryHaiku
  voted: boolean
  yours?: boolean
  scale?: number
  onToggleVote: (id: string) => void
}

export function GalleryCard({ item, voted, yours, scale, onToggleVote }: GalleryCardProps) {
  return (
    <div className="gallery-card">
      {yours && <span className="yours-tag">Yours · just saved</span>}
      <HaikuCard haiku={item.haiku} style={item.style} scale={scale} />
      <button
        type="button"
        className="upvote"
        aria-label={voted ? 'Remove your upvote' : 'Upvote this haiku'}
        aria-pressed={voted}
        onClick={() => onToggleVote(item.id)}
      >
        <UpvoteIcon />
        <span className="upvote-count">{item.upvotes}</span>
      </button>
    </div>
  )
}
