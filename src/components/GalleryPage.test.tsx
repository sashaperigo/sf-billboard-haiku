import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Phrase } from '../lib/haiku'
import type { GalleryHaiku } from '../lib/gallery'
import { fetchGalleryPage, removeUpvote, upvoteHaiku } from '../lib/gallery'
import { GalleryPage } from './GalleryPage'

vi.mock('../lib/gallery', () => ({
  fetchGalleryPage: vi.fn(),
  upvoteHaiku: vi.fn(),
  removeUpvote: vi.fn(),
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
  vi.mocked(removeUpvote).mockReset()
  localStorage.clear()
  sessionStorage.clear()
})

describe('GalleryPage', () => {
  it('renders haikus fetched from the API in the order given, sorted by top by default', async () => {
    vi.mocked(fetchGalleryPage).mockResolvedValue({ items: [entry('a', 5), entry('b', 2)], hasMore: false })
    render(<GalleryPage allPhrases={allPhrases} count={312} />)
    await waitFor(() => expect(screen.getByText('a-1')).toBeInTheDocument())
    expect(screen.getByText('b-1')).toBeInTheDocument()
    expect(fetchGalleryPage).toHaveBeenCalledWith(allPhrases, 0, { sort: 'top' })
    expect(screen.getByRole('heading', { name: 'The gallery' })).toBeInTheDocument()
    expect(screen.getByText(/312 haikus made from real Bay Area AI billboards/)).toBeInTheDocument()
  })

  it('refetches from the start when the sort changes', async () => {
    vi.mocked(fetchGalleryPage).mockResolvedValue({ items: [entry('a', 5)], hasMore: false })
    render(<GalleryPage allPhrases={allPhrases} count={1} />)
    await waitFor(() => expect(screen.getByText('a-1')).toBeInTheDocument())
    expect(screen.getByRole('button', { name: 'Top' })).toHaveAttribute('aria-pressed', 'true')

    vi.mocked(fetchGalleryPage).mockResolvedValue({ items: [entry('n', 0)], hasMore: false })
    await userEvent.click(screen.getByRole('button', { name: 'New' }))

    await waitFor(() => expect(screen.getByText('n-1')).toBeInTheDocument())
    expect(screen.queryByText('a-1')).toBeNull()
    expect(fetchGalleryPage).toHaveBeenLastCalledWith(allPhrases, 0, { sort: 'new' })
    expect(screen.getByRole('button', { name: 'New' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('shows an empty message when there are no haikus', async () => {
    vi.mocked(fetchGalleryPage).mockResolvedValue({ items: [], hasMore: false })
    render(<GalleryPage allPhrases={allPhrases} count={0} />)
    await waitFor(() => expect(screen.getByText(/no haikus yet/i)).toBeInTheDocument())
  })

  it('links back to the editor', async () => {
    vi.mocked(fetchGalleryPage).mockResolvedValue({ items: [], hasMore: false })
    render(<GalleryPage allPhrases={allPhrases} count={0} />)
    expect(screen.getByRole('link', { name: 'Make your own' })).toHaveAttribute('href', '/')
  })

  it('upvotes a haiku, marks its button pressed, and persists the vote', async () => {
    vi.mocked(fetchGalleryPage).mockResolvedValue({ items: [entry('a', 5)], hasMore: false })
    vi.mocked(upvoteHaiku).mockResolvedValue(6)
    render(<GalleryPage allPhrases={allPhrases} count={1} />)
    await waitFor(() => expect(screen.getByText('a-1')).toBeInTheDocument())

    const button = screen.getByRole('button', { name: /upvote/i })
    await userEvent.click(button)

    await waitFor(() => expect(button).toHaveAttribute('aria-pressed', 'true'))
    expect(button).toHaveTextContent('6')
    expect(JSON.parse(localStorage.getItem('votedHaikuIds') ?? '[]')).toContain('a')
  })

  it('rolls back an upvote that fails', async () => {
    vi.mocked(fetchGalleryPage).mockResolvedValue({ items: [entry('a', 5)], hasMore: false })
    vi.mocked(upvoteHaiku).mockRejectedValue(new Error('boom'))
    render(<GalleryPage allPhrases={allPhrases} count={1} />)
    await waitFor(() => expect(screen.getByText('a-1')).toBeInTheDocument())

    await userEvent.click(screen.getByRole('button', { name: /upvote/i }))

    expect(await screen.findByText(/upvote failed/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /upvote/i })).toBeEnabled()
    expect(screen.getByRole('button', { name: /upvote/i })).toHaveTextContent('5')
  })

  it('shows the upvote button as pressed for haikus already voted on from this browser', async () => {
    localStorage.setItem('votedHaikuIds', JSON.stringify(['a']))
    vi.mocked(fetchGalleryPage).mockResolvedValue({ items: [entry('a', 5)], hasMore: false })
    render(<GalleryPage allPhrases={allPhrases} count={1} />)
    await waitFor(() => expect(screen.getByRole('button', { name: /upvote/i })).toHaveAttribute('aria-pressed', 'true'))
  })

  it('removes an existing upvote when clicked again', async () => {
    localStorage.setItem('votedHaikuIds', JSON.stringify(['a']))
    vi.mocked(fetchGalleryPage).mockResolvedValue({ items: [entry('a', 5)], hasMore: false })
    vi.mocked(removeUpvote).mockResolvedValue(4)
    render(<GalleryPage allPhrases={allPhrases} count={1} />)
    const button = await screen.findByRole('button', { name: /upvote/i })

    await userEvent.click(button)

    await waitFor(() => expect(button).toHaveAttribute('aria-pressed', 'false'))
    expect(button).toHaveTextContent('4')
    expect(removeUpvote).toHaveBeenCalledWith('a')
    expect(JSON.parse(localStorage.getItem('votedHaikuIds') ?? '[]')).not.toContain('a')
  })

  it('rolls back a failed upvote removal', async () => {
    localStorage.setItem('votedHaikuIds', JSON.stringify(['a']))
    vi.mocked(fetchGalleryPage).mockResolvedValue({ items: [entry('a', 5)], hasMore: false })
    vi.mocked(removeUpvote).mockRejectedValue(new Error('boom'))
    render(<GalleryPage allPhrases={allPhrases} count={1} />)
    const button = await screen.findByRole('button', { name: /upvote/i })

    await userEvent.click(button)

    expect(await screen.findByText(/removing upvote failed/i)).toBeInTheDocument()
    expect(button).toHaveAttribute('aria-pressed', 'true')
    expect(button).toHaveTextContent('5')
  })

  it('tags the haiku saved this session', async () => {
    sessionStorage.setItem('justSavedHaikuId', 'b')
    vi.mocked(fetchGalleryPage).mockResolvedValue({ items: [entry('a', 5), entry('b', 0)], hasMore: false })
    render(<GalleryPage allPhrases={allPhrases} count={2} />)
    await waitFor(() => expect(screen.getByText('b-1')).toBeInTheDocument())
    expect(screen.getAllByText('Yours · just saved')).toHaveLength(1)
  })

  it('loads more items and appends them without clearing existing ones', async () => {
    vi.mocked(fetchGalleryPage)
      .mockResolvedValueOnce({ items: [entry('a', 5)], hasMore: true })
      .mockResolvedValueOnce({ items: [entry('b', 2)], hasMore: false })
    render(<GalleryPage allPhrases={allPhrases} count={2} />)
    await waitFor(() => expect(screen.getByText('a-1')).toBeInTheDocument())

    await userEvent.click(screen.getByRole('button', { name: /load more/i }))

    await waitFor(() => expect(screen.getByText('b-1')).toBeInTheDocument())
    expect(screen.getByText('a-1')).toBeInTheDocument()
    expect(fetchGalleryPage).toHaveBeenLastCalledWith(allPhrases, 1, { sort: 'top' })
  })
})
