import { render, screen, waitFor } from '@testing-library/react'
import type { GalleryHaiku } from '../lib/gallery'
import { fetchGalleryPage } from '../lib/gallery'
import type { Phrase } from '../lib/haiku'
import { GalleryPreview } from './GalleryPreview'

vi.mock('../lib/gallery', () => ({ fetchGalleryPage: vi.fn(), upvoteHaiku: vi.fn() }))

const phrase = (text: string, syllables: 5 | 7): Phrase => ({ id: text, text, syllables })
const allPhrases: Phrase[] = []
const entry = (id: string, upvotes: number): GalleryHaiku => ({
  id,
  haiku: [phrase(`${id}-1`, 5), phrase(`${id}-2`, 7), phrase(`${id}-3`, 5)],
  style: { faces: [0, 1, 2], inks: [0, 1, 2] },
  upvotes,
  creator: 'haikuguru',
})

beforeEach(() => {
  vi.mocked(fetchGalleryPage).mockReset()
  localStorage.clear()
})

describe('GalleryPreview', () => {
  it('shows the top three haikus with links to the full gallery', async () => {
    vi.mocked(fetchGalleryPage).mockResolvedValue({ items: [entry('a', 9), entry('b', 4), entry('c', 1)], hasMore: true })
    render(<GalleryPreview allPhrases={allPhrases} count={312} refreshKey={0} />)
    await waitFor(() => expect(screen.getByText('a-1')).toBeInTheDocument())
    expect(fetchGalleryPage).toHaveBeenCalledWith(allPhrases, 0, { sort: 'top', limit: 3 })
    expect(screen.getByRole('heading', { name: 'From the gallery' })).toBeInTheDocument()
    expect(screen.getByText(/most upvoted of 312 haikus/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'View all →' })).toHaveAttribute('href', '/gallery')
    expect(screen.getByRole('link', { name: /View full gallery 312/ })).toHaveAttribute('href', '/gallery')
  })

  it('refetches when refreshKey changes', async () => {
    vi.mocked(fetchGalleryPage).mockResolvedValue({ items: [entry('a', 9)], hasMore: false })
    const { rerender } = render(<GalleryPreview allPhrases={allPhrases} count={1} refreshKey={0} />)
    await waitFor(() => expect(fetchGalleryPage).toHaveBeenCalledTimes(1))
    rerender(<GalleryPreview allPhrases={allPhrases} count={2} refreshKey={1} />)
    await waitFor(() => expect(fetchGalleryPage).toHaveBeenCalledTimes(2))
  })

  it('renders nothing when the gallery cannot be loaded', async () => {
    vi.mocked(fetchGalleryPage).mockRejectedValue(new Error('boom'))
    const { container } = render(<GalleryPreview allPhrases={allPhrases} count={null} refreshKey={0} />)
    await waitFor(() => expect(fetchGalleryPage).toHaveBeenCalled())
    expect(container).toBeEmptyDOMElement()
  })
})
