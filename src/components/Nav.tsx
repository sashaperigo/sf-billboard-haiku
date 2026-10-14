import type { Route } from '../lib/route'
import { Link } from '../lib/route'
import { useMediaQuery } from '../lib/useMediaQuery'

export interface NavProps {
  active: Route
  /** Total haikus saved, or null while unknown. */
  count: number | null
}

export function Nav({ active, count }: NavProps) {
  const isMobile = useMediaQuery('(max-width: 700px)')
  const onGallery = active === 'gallery'
  const wordmark = (
    <Link to="/" className="wordmark">
      Billboard Haiku
    </Link>
  )
  const gallery = (
    <Link to="/gallery" className="nav-link" aria-current={onGallery ? 'page' : undefined}>
      Gallery{count !== null && ' '}
      {count !== null && <span className="nav-count">{count}</span>}
    </Link>
  )

  if (isMobile) {
    return (
      <nav className="nav" aria-label="Main">
        {onGallery ? (
          <>
            <Link to="/" className="nav-link">
              ← Make a haiku
            </Link>
            {wordmark}
          </>
        ) : (
          <>
            {wordmark}
            {gallery}
          </>
        )}
      </nav>
    )
  }

  return (
    <nav className="nav" aria-label="Main">
      {wordmark}
      <div className="nav-links">
        {onGallery ? (
          <Link to="/" className="nav-link nav-muted">
            Make a haiku
          </Link>
        ) : (
          <a href="#app" className="nav-link">
            Make a haiku
          </a>
        )}
        {gallery}
      </div>
    </nav>
  )
}
