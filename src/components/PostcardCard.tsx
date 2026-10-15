import { DownloadIcon } from './icons'
import { SHARE_OPTIONS, type ShareId } from '../lib/shareImage'

export interface PostcardCardProps {
  /** Rendered share image URLs; thumbnails fall back to the raw photos until ready. */
  thumbs: Partial<Record<ShareId, string>>
  /** Opens the share dialog, optionally on a specific backdrop. */
  onShareImage: (id?: ShareId) => void
}

export function PostcardCard({ thumbs, onShareImage }: PostcardCardProps) {
  return (
    <div className="postcard">
      <div className="postcard-text">
        <div className="postcard-heading">
          <h2>Download it as a postcard</h2>
          <p>Your haiku on four real billboards, sized for Instagram.</p>
        </div>
        <button type="button" className="btn postcard-get" onClick={() => onShareImage()}>
          <DownloadIcon /> Get images
        </button>
      </div>
      <div className="postcard-thumbs">
        {SHARE_OPTIONS.map((o) => (
          <div className="postcard-item" key={o.id}>
            <button
              type="button"
              className="postcard-thumb"
              data-id={o.id}
              aria-label={`Download ${o.label} image`}
              style={thumbs[o.id] ? { background: `url(${thumbs[o.id]}) center/cover` } : undefined}
              onClick={() => onShareImage(o.id)}
            />
            <span className="postcard-label" aria-hidden="true">
              {o.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
