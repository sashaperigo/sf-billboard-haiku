import { getJustSaved } from './lib/justSaved'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'
import phrases from './data/phrases.json'
import { countHaikus, fetchGalleryPage, saveHaikuToGallery, upvoteHaiku } from './lib/gallery'

vi.mock('./lib/shareImage', async (orig) => ({
  ...(await orig<typeof import('./lib/shareImage')>()),
  renderArtboard: vi.fn(async () => new Blob(['x'], { type: 'image/png' })),
}))

vi.mock('./lib/gallery', () => ({
  fetchGalleryPage: vi.fn(),
  saveHaikuToGallery: vi.fn(),
  countHaikus: vi.fn(),
  upvoteHaiku: vi.fn(),
}))

const textOf = (id: string) => phrases.find((p) => p.id === id)!.text
const lines = () => [1, 2, 3].map((n) => screen.getByTestId(`line-${n}`).textContent)

const copyLink = async () => {
  await userEvent.click(screen.getByRole('button', { name: 'Share' }))
  await userEvent.click(screen.getByRole('button', { name: 'Copy link' }))
}

let writeText: ReturnType<typeof vi.fn>

beforeEach(() => {
  window.history.pushState({}, '', '/')
  sessionStorage.clear()
  localStorage.clear()
  writeText = vi.fn().mockResolvedValue(undefined)
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
  vi.mocked(fetchGalleryPage).mockReset().mockResolvedValue({ items: [], hasMore: false })
  vi.mocked(countHaikus).mockReset().mockResolvedValue(312)
  vi.mocked(saveHaikuToGallery).mockReset().mockResolvedValue('new-id')
  vi.mocked(upvoteHaiku).mockReset().mockResolvedValue(1)
})

describe('App', () => {
  it('shows a haiku from the share param', () => {
    const [a, b] = phrases.filter((p) => p.syllables === 5)
    const seven = phrases.find((p) => p.syllables === 7)!
    window.history.pushState({}, '', `/?h=${a.id},${seven.id},${b.id}`)
    render(<App />)
    expect(lines()).toEqual([a.text, seven.text, b.text])
  })

  it('falls back to a random haiku for a bad param, with no error', () => {
    window.history.pushState({}, '', '/?h=nope,nope,nope')
    render(<App />)
    expect(lines().every((l) => l && l.length > 0)).toBe(true)
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('marks the haiku as a polite live region', () => {
    render(<App />)
    expect(screen.getByTestId('haiku')).toHaveAttribute('aria-live', 'polite')
  })

  it('lock toggles aria-pressed and is kept on Reroll all', async () => {
    render(<App />)
    const lock = screen.getByRole('button', { name: /lock line 1/i })
    expect(lock).toHaveAttribute('aria-pressed', 'false')
    const before = lines()
    await userEvent.click(lock)
    expect(lock).toHaveAttribute('aria-pressed', 'true')
    await userEvent.click(screen.getByRole('button', { name: 'Roll unlocked lines' }))
    const after = lines()
    expect(after[0]).toBe(before[0])
    expect(after[1]).not.toBe(before[1])
    expect(after[2]).not.toBe(before[2])
  })

  it('undo restores the haiku from before the last Reroll all, once', async () => {
    render(<App />)
    const undo = screen.getByRole('button', { name: 'Undo' })
    expect(undo).toBeDisabled()
    const before = lines()
    await userEvent.click(screen.getByRole('button', { name: 'Roll unlocked lines' }))
    expect(undo).toBeEnabled()
    await userEvent.click(undo)
    expect(lines()).toEqual(before)
    expect(undo).toBeDisabled()
  })

  it('undo steps back through multiple actions', async () => {
    render(<App />)
    const undo = screen.getByRole('button', { name: 'Undo' })
    const first = lines()
    await userEvent.click(screen.getByRole('button', { name: 'Roll unlocked lines' }))
    const second = lines()
    await userEvent.click(screen.getByRole('button', { name: 'Roll unlocked lines' }))
    await userEvent.click(undo)
    expect(lines()).toEqual(second)
    expect(undo).toBeEnabled()
    await userEvent.click(undo)
    expect(lines()).toEqual(first)
    expect(undo).toBeDisabled()
  })

  it('swap exchanges lines 1 and 3 and their locks, and undo restores the lines', async () => {
    const [a, b] = phrases.filter((p) => p.syllables === 5)
    const seven = phrases.find((p) => p.syllables === 7)!
    window.history.pushState({}, '', `/?h=${a.id},${seven.id},${b.id}`)
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: 'Lock line 1' }))
    await userEvent.click(screen.getByRole('button', { name: 'Swap lines 1 and 3' }))
    expect(lines()).toEqual([b.text, seven.text, a.text])
    expect(screen.getByRole('button', { name: 'Lock line 1' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('button', { name: 'Lock line 3' })).toHaveAttribute('aria-pressed', 'true')
    await userEvent.click(screen.getByRole('button', { name: 'Undo' }))
    expect(lines()).toEqual([a.text, seven.text, b.text])
  })

  it('opens the share dialog on the clicked postcard thumbnail', async () => {
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: 'Download Night image' }))
    const dialog = within(screen.getByRole('dialog'))
    expect(dialog.getByRole('button', { name: /Night/ })).toHaveAttribute('aria-pressed', 'true')
  })

  it('shows the help card on first mobile visit and remembers dismissal', async () => {
    localStorage.clear()
    vi.stubGlobal('matchMedia', (q: string) => ({ matches: true, media: q, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: 'Got it' }))
    expect(screen.queryByRole('button', { name: 'Got it' })).toBeNull()
    expect(localStorage.getItem('bh-help-dismissed')).toBe('1')
    await userEvent.click(screen.getByRole('button', { name: 'Help' }))
    expect(screen.getByRole('dialog', { name: 'How it works' })).toBeInTheDocument()
    vi.unstubAllGlobals()
  })

  it('disables Roll when every line is locked', async () => {
    render(<App />)
    for (const n of [1, 2, 3]) await userEvent.click(screen.getByRole('button', { name: `Lock line ${n}` }))
    expect(screen.getByRole('button', { name: 'Roll unlocked lines' })).toBeDisabled()
  })

  it('copies a share link that reproduces the haiku', async () => {
    render(<App />)
    const before = lines()
    await copyLink()
    const url = new URL(writeText.mock.calls[0][0])
    const ids = url.searchParams.get('h')!.split(',')
    expect(ids.map(textOf)).toEqual(before)
  })

  it('restores fonts from a share link', async () => {
    render(<App />)
    await copyLink()
    const url = new URL(writeText.mock.calls.at(-1)![0])
    expect(url.searchParams.get('s')).toMatch(/^\d+\.\d+,\d+\.\d+,\d+\.\d+$/)
    cleanup()
    window.history.pushState({}, '', url.search)
    render(<App />)
    await copyLink()
    expect(new URL(writeText.mock.calls.at(-1)![0]).searchParams.get('s')).toBe(url.searchParams.get('s'))
  })

  it('rerolls the font of one line without changing its text', async () => {
    render(<App />)
    const before = lines()
    const style = screen.getByTestId('line-2').getAttribute('style')
    for (let n = 0; n < 20 && screen.getByTestId('line-2').getAttribute('style') === style; n++)
      await userEvent.click(screen.getByRole('button', { name: 'New font for line 2' }))
    expect(screen.getByTestId('line-2').getAttribute('style')).not.toBe(style)
    expect(lines()).toEqual(before)
  })

  it('shows a failure message when the clipboard rejects', async () => {
    writeText.mockRejectedValue(new Error('denied'))
    render(<App />)
    await copyLink()
    expect(await screen.findByText('copy failed')).toBeInTheDocument()
  })

  it('opens the gallery page from the nav, keeps the haiku, and returns with the same haiku', async () => {
    render(<App />)
    const before = lines()

    await userEvent.click(screen.getByRole('link', { name: /^Gallery/ }))
    await waitFor(() => expect(fetchGalleryPage).toHaveBeenCalledWith(expect.anything(), 0, { sort: 'top' }))
    expect(window.location.pathname).toBe('/gallery')
    expect(screen.getByRole('heading', { name: 'The gallery' })).toBeInTheDocument()
    expect(screen.queryByTestId('haiku')).toBeNull()

    await userEvent.click(screen.getByRole('link', { name: 'Make a haiku' }))
    expect(window.location.pathname).toBe('/')
    expect(lines()).toEqual(before)
  })

  it('renders the gallery page directly from the /gallery URL', async () => {
    window.history.pushState({}, '', '/gallery/')
    render(<App />)
    expect(screen.getByRole('heading', { name: 'The gallery' })).toBeInTheDocument()
    expect(await screen.findByRole('link', { name: 'Gallery 312' })).toHaveAttribute('aria-current', 'page')
  })

  it('shows the explainer steps and the gallery preview with the total count', async () => {
    vi.mocked(fetchGalleryPage).mockResolvedValue({ items: [], hasMore: false })
    render(<App />)
    expect(screen.getByText('Tune')).toBeInTheDocument()
    expect(await screen.findByText(/The most upvoted of 312 haikus/)).toBeInTheDocument()
    expect(fetchGalleryPage).toHaveBeenCalledWith(expect.anything(), 0, { sort: 'top', limit: 3 })
  })

  it('saves the current haiku to the gallery and shows a success message', async () => {
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: 'Save to gallery' }))
    await userEvent.type(screen.getByLabelText('Nickname'), 'Sasha')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(await screen.findByText('Saved to gallery')).toBeInTheDocument()
    expect(saveHaikuToGallery).toHaveBeenCalledWith(expect.anything(), expect.anything(), 'Sasha')
  })

  it('remembers the saved id, and refreshes the count and preview after saving', async () => {
    vi.mocked(saveHaikuToGallery).mockResolvedValue('abc')
    render(<App />)
    await waitFor(() => expect(fetchGalleryPage).toHaveBeenCalledTimes(1))
    await userEvent.click(screen.getByRole('button', { name: 'Save to gallery' }))
    await userEvent.type(screen.getByLabelText('Nickname'), 'Sasha')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    await screen.findByText('Saved to gallery')
    expect(sessionStorage.getItem('justSavedHaikuId')).toBe('abc')
    await waitFor(() => expect(fetchGalleryPage).toHaveBeenCalledTimes(2))
    expect(countHaikus).toHaveBeenCalledTimes(2)
  })

  it('auto-upvotes the saved haiku and remembers the vote in this browser', async () => {
    vi.mocked(saveHaikuToGallery).mockResolvedValue('abc')
    vi.mocked(upvoteHaiku).mockResolvedValue(1)
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: 'Save to gallery' }))
    await userEvent.type(screen.getByLabelText('Nickname'), 'Sasha')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    await screen.findByText('Saved to gallery')
    expect(upvoteHaiku).toHaveBeenCalledWith('abc')
    expect(JSON.parse(localStorage.getItem('votedHaikuIds')!)).toContain('abc')
  })

  it('still reports success when the auto-upvote fails, without remembering a vote', async () => {
    vi.mocked(saveHaikuToGallery).mockResolvedValue('abc')
    vi.mocked(upvoteHaiku).mockRejectedValue(new Error('boom'))
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: 'Save to gallery' }))
    await userEvent.type(screen.getByLabelText('Nickname'), 'Sasha')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(await screen.findByText('Saved to gallery')).toBeInTheDocument()
    expect(localStorage.getItem('votedHaikuIds')).toBeNull()
  })

  it('shows a failure message when saving to the gallery fails', async () => {
    vi.mocked(countHaikus).mockReset().mockResolvedValue(312)
  vi.mocked(saveHaikuToGallery).mockRejectedValue(new Error('boom'))
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: 'Save to gallery' }))
    await userEvent.type(screen.getByLabelText('Nickname'), 'Sasha')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(await screen.findByText('Save failed')).toBeInTheDocument()
  })
})
