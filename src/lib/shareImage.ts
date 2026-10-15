import { drawBillboardArtboard, drawPhotoArtboard } from './drawing'
import { fitBoxes, fontOf } from './shareFit'

export type ShareId = '1a' | '1b' | '1c' | '1d'

export const SHARE_OPTIONS: { id: ShareId; label: string; slug: string }[] = [
    { id: '1a', label: 'Classic', slug: 'classic' },
    { id: '1b', label: 'Twin Peaks', slug: 'twin-peaks' },
    { id: '1c', label: 'Rooftop', slug: 'rooftop' },
    { id: '1d', label: 'Night', slug: 'night' },
]

export const SHARE_W = 1080
export const SHARE_H = 1350

/** Paper corners (TL, TR, BR, BL) in artboard px for the two perspective photos. */
export const QUADS: Record<'day' | 'night', number[]> = {
    day: [125.5, 428.4, 942, 272.6, 942, 595.8, 125.5, 697.6],
    night: [120.5, 462.5, 971, 498, 972.5, 751.5, 118.5, 737.5],
}
export const PAPER_W = 1000
export const PAPER_H = 292

export const shareFileName = (id: ShareId) =>
    `billboard-haiku-${SHARE_OPTIONS.find((o) => o.id === id)!.slug}-4x5.png`

export { quadMatrix } from './warp'

const withTimeout = <T>(p: Promise<T>, ms: number): Promise<T> =>
    Promise.race([p, new Promise<T>((_, rej) => setTimeout(() => rej(new Error('render timeout')), ms))])

/** Wait for p, but move on (resolving) if it stalls or fails. */
const bestEffort = (p: Promise<unknown>, ms: number) =>
    Promise.race([p.then(() => undefined, () => undefined), new Promise<void>((res) => setTimeout(res, ms))])

const decodeImg = (img: HTMLImageElement) => bestEffort(img.decode(), 2000)
const loadFont = (font: string) => bestEffort(document.fonts.load(font, 'Aa'), 1500)

/** Wait for the fonts the artboard uses, then fit every haiku box in it. */
async function prepare(ab: HTMLElement) {
    const els = [...ab.querySelectorAll<HTMLElement>('[data-line],[data-k]')]
    await Promise.all(els.map((el) => loadFont(fontOf(getComputedStyle(el)))))
    fitBoxes(ab)
}

async function drawArtboard(ab: HTMLElement): Promise<Blob> {
    const c = document.createElement('canvas')
    c.width = SHARE_W
    c.height = SHARE_H
    const ctx = c.getContext('2d')!
    await Promise.all([...ab.querySelectorAll('img')].map(decodeImg))
    await prepare(ab)
    ctx.fillStyle = getComputedStyle(ab).backgroundColor
    ctx.fillRect(0, 0, SHARE_W, SHARE_H)
    const board = ab.querySelector<HTMLElement>('[data-board]')!
    const texts = [...ab.querySelectorAll<HTMLElement>('[data-k="text"],[data-k="caption"]')]
    const photoBox = ab.querySelector<HTMLElement>('[data-k="photo"]')
    if (photoBox) drawPhotoArtboard(ctx, photoBox, board, texts)
    else drawBillboardArtboard(ctx, ab, board, texts)
    return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('toBlob failed'))), 'image/png'))
}

/** Render one mounted artboard to a 1080×1350 PNG, giving up after 10s. */
export const renderArtboard = (ab: HTMLElement) => withTimeout(drawArtboard(ab), 10000)
