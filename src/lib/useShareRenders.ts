import { type RefObject, useCallback, useEffect, useRef, useState } from 'react'
import type { Haiku } from './haiku'
import { SHARE_OPTIONS, type ShareId, renderArtboard } from './shareImage'
import type { LineCssInput } from './style'

export interface ShareRender {
    blob: Blob
    url: string
}

export type ShareRenders = Partial<Record<ShareId, ShareRender>>

/**
 * Renders the four share images from the artboards mounted under rootRef, and
 * re-renders whenever the haiku or style changes. Does nothing until enabled.
 */
export function useShareRenders(
    rootRef: RefObject<HTMLElement | null>,
    haiku: Haiku,
    style: LineCssInput,
    enabled: boolean,
): ShareRenders {
    const [renders, setRenders] = useState<ShareRenders>({})
    const urls = useRef<Partial<Record<ShareId, string>>>({})
    const busy = useRef(false)
    const again = useRef(false)
    const alive = useRef(true)

    const renderAll = useCallback(async () => {
        if (busy.current) {
            again.current = true
            return
        }
        busy.current = true
        try {
            for (const { id } of SHARE_OPTIONS) {
                const ab = rootRef.current?.querySelector<HTMLElement>(`[data-artboard="${id}"]`)
                if (!ab || !alive.current) continue
                try {
                    await new Promise((r) => setTimeout(r, 0))
                    const blob = await renderArtboard(ab)
                    if (!alive.current) break
                    const url = URL.createObjectURL(blob)
                    if (urls.current[id]) URL.revokeObjectURL(urls.current[id]!)
                    urls.current[id] = url
                    setRenders((r) => ({ ...r, [id]: { blob, url } }))
                } catch (e) {
                    console.error('share render failed', id, e)
                }
            }
        } finally {
            busy.current = false
        }
        if (again.current && alive.current) {
            again.current = false
            void renderAll()
        }
    }, [rootRef])

    useEffect(() => {
        if (enabled) void renderAll()
    }, [enabled, renderAll, haiku, style])

    useEffect(() => {
        alive.current = true
        const held = urls.current
        return () => {
            alive.current = false
            Object.values(held).forEach((u) => u && URL.revokeObjectURL(u))
        }
    }, [])

    return renders
}
