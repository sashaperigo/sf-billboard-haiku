import { render, screen } from '@testing-library/react'
import { Nav } from './Nav'

describe('Nav', () => {
  it('links to the gallery with the count, and to the editor anchor on home', () => {
    render(<Nav active="home" count={312} />)
    expect(screen.getByRole('link', { name: 'Billboard Haiku' })).toHaveAttribute('href', '/')
    expect(screen.getByRole('link', { name: 'Make a haiku' })).toHaveAttribute('href', '#app')
    const gallery = screen.getByRole('link', { name: /^Gallery/ })
    expect(gallery).toHaveAttribute('href', '/gallery')
    expect(gallery).toHaveTextContent('Gallery 312')
    expect(gallery).not.toHaveAttribute('aria-current')
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
})
