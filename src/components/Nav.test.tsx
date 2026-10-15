import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Nav } from './Nav'

describe('Nav', () => {
  it('links to the gallery with the count, and to the editor anchor on home', () => {
    render(<Nav active="home" count={312} />)
    expect(screen.getByRole('link', { name: 'Tech Billboard Haiku Generator' })).toHaveAttribute('href', '/')
    expect(screen.getByRole('link', { name: 'Make a haiku' })).toHaveAttribute('href', '#app')
    const gallery = screen.getByRole('link', { name: /^Gallery/ })
    expect(gallery).toHaveAttribute('href', '/gallery')
    expect(gallery).toHaveTextContent('Gallery 312')
    expect(gallery).not.toHaveAttribute('aria-current')
  })

  it('hides the wordmark from assistive tech and focus while the hero title is showing', () => {
    render(<Nav active="home" count={1} showWordmark={false} />)
    expect(screen.queryByRole('link', { name: 'Tech Billboard Haiku Generator' })).toBeNull()
    const hidden = screen.getByRole('link', { hidden: true, name: '' })
    expect(hidden).toHaveAttribute('href', '/')
    expect(hidden).toHaveAttribute('aria-hidden', 'true')
    expect(hidden).toHaveAttribute('tabindex', '-1')
    expect(hidden).toHaveAttribute('data-hidden')
  })

  it('omits the count while it is unknown', () => {
    render(<Nav active="home" count={null} />)
    expect(screen.getByRole('link', { name: /^Gallery/ })).toHaveTextContent(/^Gallery$/)
  })

  it('marks the gallery link current on the gallery page and sends Make a haiku home', () => {
    render(<Nav active="gallery" count={5} />)
    expect(screen.getByRole('link', { name: /^Gallery/ })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Make a haiku' })).toHaveAttribute('href', '/')
  })

  it('shows the Help button only on mobile home, and calls onHelp', async () => {
    const onHelp = vi.fn()
    const mm = vi.fn((q: string) => ({ matches: true, media: q, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
    vi.stubGlobal('matchMedia', mm)
    const { unmount } = render(<Nav active="home" count={1} onHelp={onHelp} />)
    await userEvent.click(screen.getByRole('button', { name: 'Help' }))
    expect(onHelp).toHaveBeenCalledTimes(1)
    unmount()
    render(<Nav active="gallery" count={1} onHelp={onHelp} />)
    expect(screen.queryByRole('button', { name: 'Help' })).toBeNull()
    vi.unstubAllGlobals()
  })
})
