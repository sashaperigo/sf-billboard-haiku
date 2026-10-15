import { createHash } from 'node:crypto'
import { render } from '@testing-library/react'
import { createElement } from 'react'
import { Artboards } from '../components/ShareArtboards'
import type { Haiku, Phrase } from './haiku'
import { type ShareId, renderArtboard } from './shareImage'
import type { Style } from './style'

// jsdom does no layout, so line fitting is stubbed to a deterministic non-trivial result.
vi.mock('./fit', () => ({
    fitLines: (_box: HTMLElement, els: HTMLElement[]) => els.map((_, i) => ({ s: 1 - 0.1 * i, dy: i })),
}))

const phrase = (text: string, syllables: 5 | 7): Phrase => ({ id: text, text, syllables })
const haiku: Haiku = [phrase('one', 5), phrase('two', 7), phrase('three', 5)]
const style: Style = { faces: [0, 1, 2], inks: [0, 1, 2] }

/* ---- a canvas that records every call instead of drawing ---- */

let log: string[] = []
let nextCanvas = 0
let nextGradient = 0
const canvasIds = new WeakMap<object, number>()
const contexts = new WeakMap<object, unknown>()

const round = (n: number) => Math.round(n * 1e6) / 1e6
function fmt(v: unknown): string {
    if (typeof v === 'number') return String(round(v))
    if (v instanceof HTMLCanvasElement) return `canvas#${canvasIds.get(v)}(${v.width}x${v.height})`
    if (v instanceof HTMLElement) return `<${v.tagName.toLowerCase()}>`
    if (v && typeof v === 'object' && 'gradient' in v) return `gradient#${(v as { gradient: number }).gradient}`
    if (v && typeof v === 'object' && 'data' in v) {
        const d = (v as { data: Uint8ClampedArray }).data
        return `pixels(sum=${d.reduce((a, b) => a + b, 0)})`
    }
    return JSON.stringify(v)
}

function gradient() {
    const gradientId = nextGradient++
    return { gradient: gradientId, addColorStop: (offset: number, color: string) => log.push(`gradient#${gradientId} stop ${offset} ${color}`) }
}

function recordingContext(id: number) {
    const state: Record<string, unknown> = {}
    const results: Record<string, (...a: unknown[]) => unknown> = {
        measureText: () => ({
            fontBoundingBoxAscent: 10,
            fontBoundingBoxDescent: 4,
            actualBoundingBoxAscent: 8,
            actualBoundingBoxDescent: 2,
        }),
        createLinearGradient: () => gradient(),
        createRadialGradient: () => gradient(),
        getImageData: (_x, _y, w, h) => ({ data: new Uint8ClampedArray((w as number) * (h as number) * 4).map((_, i) => i % 256) }),
    }
    return new Proxy(
        {},
        {
            get(_, prop: string) {
                if (prop in state) return state[prop]
                return (...args: unknown[]) => {
                    log.push(`${id}.${prop}(${args.map(fmt).join(', ')})`)
                    return results[prop]?.(...args)
                }
            },
            set(_, prop: string, value) {
                state[prop] = value
                log.push(`${id}.${prop} = ${fmt(value)}`)
                return true
            },
        },
    )
}

/* ---- layout: derive deterministic offsets from each element's inline px style ---- */

const px = (el: HTMLElement, prop: 'left' | 'top' | 'width' | 'height') => {
    const n = parseFloat(el.style[prop])
    return Number.isFinite(n) && !el.style[prop].endsWith('%') ? n : prop === 'width' || prop === 'height' ? 100 : 7
}

beforeAll(() => {
    for (const [name, prop] of [
        ['offsetLeft', 'left'],
        ['offsetTop', 'top'],
        ['offsetWidth', 'width'],
        ['offsetHeight', 'height'],
    ] as const) {
        Object.defineProperty(HTMLElement.prototype, name, { configurable: true, get() { return px(this, prop) } })
    }
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (this: HTMLCanvasElement) {
        if (!canvasIds.has(this)) canvasIds.set(this, nextCanvas++)
        if (!contexts.has(this)) contexts.set(this, recordingContext(canvasIds.get(this)!))
        return contexts.get(this) as CanvasRenderingContext2D
    } as never)
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(function (this: HTMLCanvasElement, cb: BlobCallback) {
        log.push(`toBlob(${fmt(this)})`)
        cb(new Blob(['png'], { type: 'image/png' }))
    })
    HTMLImageElement.prototype.decode = () => Promise.resolve()
    Object.defineProperty(document, 'fonts', { configurable: true, value: { load: () => Promise.resolve([]) } })
})

async function renderLog(id: ShareId) {
    log = []
    nextCanvas = 0
    nextGradient = 0
    const { container, unmount } = render(createElement(Artboards, { haiku, style }))
    const ab = container.querySelector<HTMLElement>(`[data-artboard="${id}"]`)!
    const blob = await renderArtboard(ab)
    unmount()
    expect(blob.type).toBe('image/png')
    return log
}

/**
 * The perspective warp alone issues thousands of calls, so snapshot a readable summary: the op counts,
 * the first and last calls, and a hash of the whole sequence (which is what makes it strict).
 */
function summarize(calls: string[]) {
    const ops: Record<string, number> = {}
    for (const c of calls) {
        const op = c.replace(/^\d+\./, '').replace(/[ (=].*/, '')
        ops[op] = (ops[op] ?? 0) + 1
    }
    return {
        total: calls.length,
        sha1: createHash('sha1').update(calls.join('\n')).digest('hex'),
        ops: Object.fromEntries(Object.entries(ops).sort()),
        head: calls.slice(0, 40),
        tail: calls.slice(-15),
    }
}

describe('renderArtboard', () => {
    // Golden-master of the exact drawing-call sequence for each artboard. Update the snapshots only
    // for an intentional change to how the share images look.
    it.each(['1a', '1b', '1c', '1d'] as const)('draws artboard %s exactly as before', async (id) => {
        expect(summarize(await renderLog(id))).toMatchSnapshot()
    })

    it('1a (photo): clips the photo, rotates the board over it, and centers the text below', async () => {
        const calls = (await renderLog('1a')).join('\n')
        expect(calls).toContain('clip()')
        expect(calls).toContain('rotate(-0.004887)')
        expect(calls).toContain('globalCompositeOperation = "multiply"')
        expect(calls).toContain('textAlign = "center"')
        expect(calls).not.toContain('textAlign = "right"')
    })

    it('1b (sutro): draws the board flat on the photo with right-aligned caption', async () => {
        const calls = (await renderLog('1b')).join('\n')
        expect(calls).not.toContain('rotate(')
        expect(calls).toContain('textAlign = "right"')
    })

    it('1c (day) and 1d (night) warp the board onto the quad; only night adds a glow', async () => {
        const day = (await renderLog('1c')).join('\n')
        const night = (await renderLog('1d')).join('\n')
        expect(day).toContain('transform(')
        expect(night).toContain('transform(')
        expect(day).not.toContain('shadowBlur = 60')
        expect(night).toContain('shadowBlur = 60')
    })

    it('encodes a PNG exactly once per artboard', async () => {
        for (const id of ['1a', '1b', '1c', '1d'] as const) {
            expect((await renderLog(id)).filter((l) => l.startsWith('toBlob'))).toHaveLength(1)
        }
    })
})
