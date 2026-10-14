import { render, screen } from '@testing-library/react'
import { Steps } from './Steps'

describe('Steps', () => {
  it('explains Roll, Tune and Save', () => {
    render(<Steps />)
    for (const title of ['Roll', 'Tune', 'Save']) expect(screen.getByText(title)).toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(3)
  })
})
