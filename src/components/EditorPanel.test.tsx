import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Haiku, Phrase } from '../lib/haiku'
import { EditorPanel, type EditorPanelProps } from './EditorPanel'

const phrase = (text: string, syllables: 5 | 7): Phrase => ({ id: text, text, syllables })
const haiku: Haiku = [phrase('one', 5), phrase('two', 7), phrase('three', 5)]

const baseProps: EditorPanelProps = {
    haiku,
    style: { faces: [0, 1, 2], inks: [0, 1, 2] },
    locks: [false, false, false],
    canUndo: false,
    saveResult: null,
    onToggleLock: vi.fn(),
    onRerollFont: vi.fn(),
    onRoll: vi.fn(),
    onUndo: vi.fn(),
    onSwap: vi.fn(),
    onShare: vi.fn(),
    onSave: vi.fn(),
}

const setup = (over: Partial<EditorPanelProps> = {}) => {
  const props: EditorPanelProps = { ...baseProps, ...over }
  render(
    <EditorPanel {...props} />,
  )
  return props
}

describe('EditorPanel', () => {
  it('labels each line with its syllable count and text', () => {
    setup()
    expect(screen.getByText('Line 1')).toBeInTheDocument()
    expect(screen.getAllByText('5 syllables')).toHaveLength(2)
    expect(screen.getByText('7 syllables')).toBeInTheDocument()
    expect(screen.getByText('two')).toBeInTheDocument()
  })

  it('wires the per-line buttons', async () => {
    const p = setup()
    await userEvent.click(screen.getByRole('button', { name: 'New font for line 2' }))
    expect(p.onRerollFont).toHaveBeenCalledWith(1)
    await userEvent.click(screen.getByRole('button', { name: 'Lock line 3' }))
    expect(p.onToggleLock).toHaveBeenCalledWith(2)
  })

  it('shows Locked with aria-pressed for locked lines', () => {
    setup({ locks: [true, false, false] })
    const lock = screen.getByRole('button', { name: 'Lock line 1' })
    expect(lock).toHaveAttribute('aria-pressed', 'true')
    expect(lock).toHaveTextContent('Locked')
    expect(screen.getByRole('button', { name: 'Lock line 2' })).toHaveTextContent(/^Lock$/)
  })

  it('disables Roll when everything is locked and Undo when there is no history', () => {
    setup({ locks: [true, true, true] })
    expect(screen.getByRole('button', { name: 'Roll unlocked lines' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Undo' })).toBeDisabled()
  })

  it('fires the action handlers', async () => {
    const p = setup({ canUndo: true })
    await userEvent.click(screen.getByRole('button', { name: 'Roll unlocked lines' }))
    await userEvent.click(screen.getByRole('button', { name: 'Undo' }))
    await userEvent.click(screen.getByRole('button', { name: 'Swap lines 1 and 3' }))
    await userEvent.click(screen.getByRole('button', { name: 'Share' }))
    await userEvent.click(screen.getByRole('button', { name: 'Save to gallery' }))
    for (const fn of [p.onRoll, p.onUndo, p.onSwap, p.onShare, p.onSave])
      expect(fn).toHaveBeenCalledTimes(1)
  })

  it('shows a Saved to gallery tag with a link, or Save failed', () => {
    const { unmount } = render(
      <EditorPanel {...baseProps} saveResult={{ ok: true, n: 1 }} />,
    )
    expect(screen.getByRole('status')).toHaveTextContent('Saved to gallery')
    expect(screen.getByRole('link', { name: /View/ })).toHaveAttribute('href', '/gallery')
    unmount()
    render(
      <EditorPanel {...baseProps} saveResult={{ ok: false, n: 1 }} />,
    )
    expect(screen.getByRole('status')).toHaveTextContent('Save failed')
    expect(screen.queryByRole('link', { name: /View/ })).toBeNull()
  })
})
