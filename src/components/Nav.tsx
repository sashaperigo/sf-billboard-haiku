import type { Route } from '../lib/route'
import { Link } from '../lib/route'
import { useMediaQuery } from '../lib/useMediaQuery'
import { TitleLine } from './Title'

export interface NavProps {
  active: Route
  /** Total haikus saved, or null while unknown. */
  count: number | null
  /** Opens the mobile help sheet; the ? button shows on mobile home only. */
  onHelp?: () => void
  helpOpen?: boolean
  /** False while the hero title is on screen (home only), so the name shows once. */
  showWordmark?: boolean
}

export function Nav({ active, count, onHelp, helpOpen = false, showWordmark = true }: NavProps) {
  const isMobile = useMediaQuery('(max-width: 700px)')
  const onGallery = active === 'gallery'
  const wordmark = (
    <Link
      to="/"
      className="wordmark"
      aria-label={isMobile ? 'Billboard Haiku' : 'Tech Billboard Haiku Generator'}
      data-hidden={!showWordmark || undefined}
      aria-hidden={!showWordmark || undefined}
      tabIndex={showWordmark ? undefined : -1}
    >
      <TitleLine words={isMobile ? [1, 2] : [0, 1, 2, 3]} />
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
            <div className="nav-links">
              {gallery}
              {onHelp && (
                <button
                  type="button"
                  className="help-btn"
                  aria-label="Help"
                  title="Help"
                  aria-expanded={helpOpen}
                  onClick={onHelp}
                >
                  ?
                </button>
              )}
            </div>
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
