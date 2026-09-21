import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'
import phrases from './data/phrases.json'

const textOf = (id: string) => phrases.find((p) => p.id === id)!.text
const lines = () => [1, 2, 3].map((n) => screen.getByTestId(`line-${n}`).textContent)

let writeText: ReturnType<typeof vi.fn>

beforeEach(() => {
  window.history.pushState({}, '', '/')
  writeText = vi.fn().mockResolvedValue(undefined)
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
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

  it('rerolls a single line only', async () => {
    render(<App />)
    const before = lines()
    await userEvent.click(screen.getByRole('button', { name: 'Reroll line 2' }))
    const after = lines()
    expect(after[0]).toBe(before[0])
    expect(after[2]).toBe(before[2])
    expect(after[1]).not.toBe(before[1])
  })

  it('lock toggles aria-pressed, disables line reroll, and is kept on Reroll all', async () => {
    render(<App />)
    const lock = screen.getByRole('button', { name: /lock line 1/i })
    expect(lock).toHaveAttribute('aria-pressed', 'false')
    const before = lines()
    await userEvent.click(lock)
    expect(lock).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Reroll line 1' })).toBeDisabled()
    await userEvent.click(screen.getByRole('button', { name: 'Reroll all' }))
    const after = lines()
    expect(after[0]).toBe(before[0])
    expect(after[1]).not.toBe(before[1])
    expect(after[2]).not.toBe(before[2])
  })

  it('disables Reroll all when every line is locked', async () => {
    render(<App />)
    for (const n of [1, 2, 3]) await userEvent.click(screen.getByRole('button', { name: `Lock line ${n}` }))
    expect(screen.getByRole('button', { name: 'Reroll all' })).toBeDisabled()
  })

  it('copies the haiku as plain text and confirms', async () => {
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: 'Copy haiku' }))
    expect(writeText).toHaveBeenCalledWith(lines().join('\n'))
    expect(await screen.findByText('haiku copied')).toBeInTheDocument()
  })

  it('copies a share link that reproduces the haiku', async () => {
    render(<App />)
    const before = lines()
    await userEvent.click(screen.getByRole('button', { name: 'Copy link' }))
    const url = new URL(writeText.mock.calls[0][0])
    const ids = url.searchParams.get('h')!.split(',')
    expect(ids.map(textOf)).toEqual(before)
  })

  it('shows a failure message when the clipboard rejects', async () => {
    writeText.mockRejectedValue(new Error('denied'))
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: 'Copy haiku' }))
    expect(await screen.findByText('copy failed')).toBeInTheDocument()
  })
})
