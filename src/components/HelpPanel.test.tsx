import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HelpCard, HelpSheet } from './HelpPanel'

describe('HelpCard', () => {
  it('lists the three steps and dismisses from × or Got it', async () => {
    const onDismiss = vi.fn()
    render(<HelpCard onDismiss={onDismiss} />)
    expect(screen.getAllByRole('listitem')).toHaveLength(3)
    await userEvent.click(screen.getByRole('button', { name: 'Dismiss' }))
    await userEvent.click(screen.getByRole('button', { name: 'Got it' }))
    expect(onDismiss).toHaveBeenCalledTimes(2)
  })
})

describe('HelpSheet', () => {
  it('closes on ×, Escape, scrim tap and swipe down, but not on a sheet tap', async () => {
    const onClose = vi.fn()
    render(<HelpSheet onClose={onClose} />)
    const dialog = screen.getByRole('dialog')
    await userEvent.click(dialog)
    expect(onClose).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole('button', { name: 'Close' }))
    await userEvent.keyboard('{Escape}')
    await userEvent.click(dialog.parentElement!)
    fireEvent.touchStart(dialog, { touches: [{ clientY: 100 }] })
    fireEvent.touchEnd(dialog, { changedTouches: [{ clientY: 220 }] })
    expect(onClose).toHaveBeenCalledTimes(4)
    fireEvent.touchStart(dialog, { touches: [{ clientY: 100 }] })
    fireEvent.touchEnd(dialog, { changedTouches: [{ clientY: 110 }] })
    expect(onClose).toHaveBeenCalledTimes(4)
  })
})
