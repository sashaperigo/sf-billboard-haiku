type Params = Record<string, string | number | boolean>

declare global {
    interface Window {
        gtag?: (command: 'event', name: string, params?: Params) => void
    }
}

export function track(name: string, params?: Params) {
    try {
        window.gtag?.('event', name, params)
    } catch {
        /* analytics must never break the app */
    }
}

export function trackPageView(path: string) {
    track('page_view', { page_path: path, page_location: window.location.href, page_title: document.title })
}
