import { render, screen, waitFor } from '@testing-library/react'
import { useRef } from 'react'
import userEvent from '@testing-library/user-event'
import type { Haiku, Phrase } from '../lib/haiku'
import { renderArtboard } from '../lib/shareImage'
import { useShareRenders } from '../lib/useShareRenders'
import type { ShareId } from '../lib/shareImage'
import { Artboards } from './ShareArtboards'
import { ShareDialog } from './ShareDialog'

vi.mock('../lib/shareImage', async (orig) => ({
  ...(await orig<typeof import('../lib/shareImage')>()),
  renderArtboard: vi.fn(),
}))

const phrase = (text: string, syllables: 5 | 7): Phrase => ({ id: text, text, syllables })
const haiku: Haiku = [phrase('one', 5), phrase('two', 7), phrase('three', 5)]
const style = { faces: [0, 1, 2], inks: [0, 1, 2] } as { faces: [number, number, number]; inks: [number, number, number] }

beforeEach(() => {
  vi.mocked(renderArtboard).mockReset().mockImplementation(async () => new Blob(['x'], { type: 'image/png' }))
  let n = 0
  URL.createObjectURL = vi.fn(() => `blob:test/${n++}`)
  URL.revokeObjectURL = vi.fn()
})

function Harness({ onClose = vi.fn(), initialSelected }: { onClose?: () => void; initialSelected?: ShareId }) {
  const ref = useRef<HTMLDivElement>(null)
  const renders = useShareRenders(ref, haiku, style, true)
  return (
    <>
      <ShareDialog renders={renders} initialSelected={initialSelected} shareUrl={() => 'https://x.test/?h=a'} onClose={onClose} />
      <div ref={ref}>
        <Artboards haiku={haiku} style={style} />
      </div>
    </>
  )
}

describe('ShareDialog', () => {
  it('renders all four options and shows tiles as they finish', async () => {
    render(<Harness />)
    expect(screen.getByText('Rendering…')).toBeInTheDocument()
    await waitFor(() => expect(renderArtboard).toHaveBeenCalledTimes(4))
    for (const label of ['Classic', 'Twin Peaks', 'Rooftop', 'Night'])
      expect(await screen.findByRole('img', { name: label })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Twin Peaks/ })).toHaveAttribute('aria-pressed', 'true')
  })

  it('opens on the preselected backdrop', async () => {
    render(<Harness initialSelected="1d" />)
    await screen.findByRole('img', { name: 'Night' })
    expect(screen.getByRole('button', { name: /Night/ })).toHaveAttribute('aria-pressed', 'true')
  })

  it('selects a different backdrop', async () => {
    render(<Harness />)
    await screen.findByRole('img', { name: 'Night' })
    await userEvent.click(screen.getByRole('button', { name: /Night/ }))
    expect(screen.getByRole('button', { name: /Night/ })).toHaveAttribute('aria-pressed', 'true')
  })

  it('downloads with the backdrop name in the filename', async () => {
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)
    render(<Harness />)
    await screen.findByRole('img', { name: 'Night' })
    await userEvent.click(screen.getByRole('button', { name: /Rooftop/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Save image' }))
    expect(click).toHaveBeenCalledTimes(1)
    expect(click.mock.contexts[0]).toHaveProperty('download', 'billboard-haiku-rooftop-4x5.png')
    expect(screen.getByRole('status')).toHaveTextContent('downloaded')
    click.mockRestore()
  })

  it('says still rendering before anything is ready', async () => {
    vi.mocked(renderArtboard).mockImplementation(() => new Promise(() => undefined))
    render(<Harness />)
    await userEvent.click(screen.getByRole('button', { name: 'Save image' }))
    expect(screen.getByRole('status')).toHaveTextContent('still rendering')
  })

  it('hides More… when the browser cannot share files', () => {
    Object.defineProperty(navigator, 'canShare', { value: undefined, configurable: true })
    render(<Harness />)
    expect(screen.queryByRole('button', { name: 'More…' })).not.toBeInTheDocument()
  })

  it('opens the native share sheet from More… when supported', async () => {
    const share = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'canShare', { value: () => true, configurable: true })
    Object.defineProperty(navigator, 'share', { value: share, configurable: true })
    render(<Harness />)
    await screen.findByRole('img', { name: 'Night' })
    await userEvent.click(screen.getByRole('button', { name: 'More…' }))
    expect(share).toHaveBeenCalledTimes(1)
    Object.defineProperty(navigator, 'canShare', { value: undefined, configurable: true })
  })

  it('copies the share link and confirms', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    render(<Harness />)
    await userEvent.click(screen.getByRole('button', { name: 'Copy link' }))
    expect(writeText).toHaveBeenCalledWith('https://x.test/?h=a')
    expect(await screen.findByText('link copied')).toBeInTheDocument()
  })

  it('reports when the clipboard rejects', async () => {
    const writeText = vi.fn().mockRejectedValue(new Error('denied'))
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    render(<Harness />)
    await userEvent.click(screen.getByRole('button', { name: 'Copy link' }))
    expect(await screen.findByText('copy failed')).toBeInTheDocument()
  })

  it('closes on Escape and the close button, revoking URLs', async () => {
    const onClose = vi.fn()
    const { unmount } = render(<Harness onClose={onClose} />)
    await screen.findByRole('img', { name: 'Night' })
    await userEvent.keyboard('{Escape}')
    await userEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(onClose).toHaveBeenCalledTimes(2)
    unmount()
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(4)
  })
})
