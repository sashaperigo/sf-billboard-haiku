import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Phrase } from '../lib/haiku'
import type { GalleryHaiku } from '../lib/gallery'
import { fetchGalleryPage, upvoteHaiku } from '../lib/gallery'
import { Gallery } from './Gallery'

vi.mock('../lib/gallery', () => ({
  fetchGalleryPage: vi.fn(),
  upvoteHaiku: vi.fn(),
}))

const phrase = (text: string, syllables: 5 | 7): Phrase => ({ id: text, text, syllables })
const allPhrases: Phrase[] = []

const entry = (id: string, upvotes: number): GalleryHaiku => ({
  id,
  haiku: [phrase(`${id}-1`, 5), phrase(`${id}-2`, 7), phrase(`${id}-3`, 5)],
  style: { faces: [0, 1, 2], inks: [0, 1, 2] },
  upvotes,
})

beforeEach(() => {
  vi.mocked(fetchGalleryPage).mockReset()
  vi.mocked(upvoteHaiku).mockReset()
  localStorage.clear()
})

describe('Gallery', () => {
  it('renders haikus fetched from the API in the order given', async () => {
    vi.mocked(fetchGalleryPage).mockResolvedValue({ items: [entry('a', 5), entry('b', 2)], hasMore: false })
    render(<Gallery allPhrases={allPhrases} onBack={() => {}} />)
    await waitFor(() => expect(screen.getByText('a-1')).toBeInTheDocument())
    expect(screen.getByText('b-1')).toBeInTheDocument()
  })

  it('shows an empty message when there are no haikus', async () => {
    vi.mocked(fetchGalleryPage).mockResolvedValue({ items: [], hasMore: false })
    render(<Gallery allPhrases={allPhrases} onBack={() => {}} />)
    await waitFor(() => expect(screen.getByText(/no haikus yet/i)).toBeInTheDocument())
  })

  it('calls onBack when the back button is clicked', async () => {
    vi.mocked(fetchGalleryPage).mockResolvedValue({ items: [], hasMore: false })
    const onBack = vi.fn()
    render(<Gallery allPhrases={allPhrases} onBack={onBack} />)
    await userEvent.click(screen.getByRole('button', { name: /back to editor/i }))
    expect(onBack).toHaveBeenCalled()
  })

  it('upvotes a haiku, disables its button, and persists the vote', async () => {
    vi.mocked(fetchGalleryPage).mockResolvedValue({ items: [entry('a', 5)], hasMore: false })
    vi.mocked(upvoteHaiku).mockResolvedValue(6)
    render(<Gallery allPhrases={allPhrases} onBack={() => {}} />)
    await waitFor(() => expect(screen.getByText('a-1')).toBeInTheDocument())

    const button = screen.getByRole('button', { name: /upvote/i })
    await userEvent.click(button)

    await waitFor(() => expect(button).toBeDisabled())
    expect(JSON.parse(localStorage.getItem('votedHaikuIds') ?? '[]')).toContain('a')
  })

  it('pre-disables the upvote button for haikus already voted on from this browser', async () => {
    localStorage.setItem('votedHaikuIds', JSON.stringify(['a']))
    vi.mocked(fetchGalleryPage).mockResolvedValue({ items: [entry('a', 5)], hasMore: false })
    render(<Gallery allPhrases={allPhrases} onBack={() => {}} />)
    await waitFor(() => expect(screen.getByRole('button', { name: /upvote/i })).toBeDisabled())
  })

  it('loads more items and appends them without clearing existing ones', async () => {
    vi.mocked(fetchGalleryPage)
      .mockResolvedValueOnce({ items: [entry('a', 5)], hasMore: true })
      .mockResolvedValueOnce({ items: [entry('b', 2)], hasMore: false })
    render(<Gallery allPhrases={allPhrases} onBack={() => {}} />)
    await waitFor(() => expect(screen.getByText('a-1')).toBeInTheDocument())

    await userEvent.click(screen.getByRole('button', { name: /load more/i }))

    await waitFor(() => expect(screen.getByText('b-1')).toBeInTheDocument())
    expect(screen.getByText('a-1')).toBeInTheDocument()
    expect(fetchGalleryPage).toHaveBeenLastCalledWith(allPhrases, 1)
  })
})
