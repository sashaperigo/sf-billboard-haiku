import { act, fireEvent, render, renderHook, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Link, navigate, routeFromPath, useRoute } from './route'

beforeEach(() => window.history.pushState({}, '', '/'))

describe('routeFromPath', () => {
    it('maps paths to routes', () => {
        expect(routeFromPath('/')).toBe('home')
        expect(routeFromPath('/gallery')).toBe('gallery')
        expect(routeFromPath('/gallery/')).toBe('gallery')
        expect(routeFromPath('/anything-else')).toBe('home')
    })
})

describe('useRoute', () => {
    it('reads the current path', () => {
        window.history.pushState({}, '', '/gallery/')
        expect(renderHook(() => useRoute()).result.current).toBe('gallery')
    })

    it('updates on navigate and on popstate (back button)', () => {
        const { result } = renderHook(() => useRoute())
        expect(result.current).toBe('home')
        act(() => navigate('/gallery'))
        expect(result.current).toBe('gallery')
        expect(window.location.pathname).toBe('/gallery')
        act(() => {
            window.history.pushState({}, '', '/')
            window.dispatchEvent(new PopStateEvent('popstate'))
        })
        expect(result.current).toBe('home')
    })
})

describe('Link', () => {
    it('navigates without a page load on a plain click', async () => {
        render(<Link to="/gallery">Gallery</Link>)
        await userEvent.click(screen.getByRole('link', { name: 'Gallery' }))
        expect(window.location.pathname).toBe('/gallery')
    })

    it('leaves modified clicks to the browser', () => {
        render(<Link to="/gallery">Gallery</Link>)
        fireEvent.click(screen.getByRole('link', { name: 'Gallery' }), { ctrlKey: true })
        expect(window.location.pathname).toBe('/')
    })
})
