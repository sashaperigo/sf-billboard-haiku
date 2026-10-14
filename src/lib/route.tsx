import { type AnchorHTMLAttributes, type MouseEvent, useSyncExternalStore } from 'react'

export type Route = 'home' | 'gallery'

export function routeFromPath(path: string): Route {
    return path.replace(/\/+$/, '') === '/gallery' ? 'gallery' : 'home'
}

const NAV_EVENT = 'app:navigate'

export function navigate(to: string) {
    window.history.pushState({}, '', to)
    window.dispatchEvent(new Event(NAV_EVENT))
    window.scrollTo?.(0, 0)
}

function subscribe(onChange: () => void) {
    window.addEventListener('popstate', onChange)
    window.addEventListener(NAV_EVENT, onChange)
    return () => {
        window.removeEventListener('popstate', onChange)
        window.removeEventListener(NAV_EVENT, onChange)
    }
}

export function useRoute(): Route {
    return useSyncExternalStore(subscribe, () => routeFromPath(window.location.pathname))
}

export function Link({ to, onClick, ...rest }: { to: string } & AnchorHTMLAttributes<HTMLAnchorElement>) {
    const handle = (e: MouseEvent<HTMLAnchorElement>) => {
        onClick?.(e)
        if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
        e.preventDefault()
        navigate(to)
    }
    return <a href={to} onClick={handle} {...rest} />
}
