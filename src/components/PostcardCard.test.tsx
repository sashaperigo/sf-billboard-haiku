import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PostcardCard } from './PostcardCard'

describe('PostcardCard', () => {
  it('opens the share dialog, optionally on one backdrop', async () => {
    const onShareImage = vi.fn()
    render(<PostcardCard thumbs={{ '1d': 'blob:night' }} onShareImage={onShareImage} />)
    await userEvent.click(screen.getByRole('button', { name: 'Get images' }))
    expect(onShareImage).toHaveBeenLastCalledWith()
    await userEvent.click(screen.getByRole('button', { name: 'Download Night image' }))
    expect(onShareImage).toHaveBeenLastCalledWith('1d')
    expect(screen.getByRole('button', { name: 'Download Night image' })).toHaveStyle({ background: 'url(blob:night) center/cover' })
  })
})
