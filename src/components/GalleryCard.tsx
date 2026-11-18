import type { GalleryHaiku } from '../lib/gallery'
import { HaikuCard } from './HaikuCard'
import { DownloadIcon, UpvoteIcon } from './icons'

export interface GalleryCardProps {
  item: GalleryHaiku
  voted: boolean
  yours?: boolean
  scale?: number
  plain?: boolean
  onToggleVote: (id: string) => void
  onShare?: (item: GalleryHaiku) => void
}

export function GalleryCard({ item, voted, yours, scale, plain, onToggleVote, onShare }: GalleryCardProps) {
  return (
    <div className="gallery-card">
      <HaikuCard haiku={item.haiku} style={item.style} scale={scale} plain={plain} />
      <div className="gallery-card-foot">
        <span className="creator">
          by {item.creator}
          {yours && <span className="yours-tag">Yours · just saved</span>}
        </span>
      <div className="gallery-card-actions">
        {onShare && (
          <button type="button" className="upvote" aria-label="Download postcards" onClick={() => onShare(item)}>
            <DownloadIcon />
          </button>
        )}
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
      </div>
    </div>
  )
}
