import { computeLayout } from './layout'

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

const LUT = Array.from({ length: 256 }, (_, v) => Math.round(255 * (v / 255) ** 0.65))

const withTimeout = <T>(p: Promise<T>, ms: number): Promise<T> =>
    Promise.race([p, new Promise<T>((_, rej) => setTimeout(() => rej(new Error('render timeout')), ms))])

/** Wait for p, but move on (resolving) if it stalls or fails. */
const bestEffort = (p: Promise<unknown>, ms: number) =>
    Promise.race([p.then(() => undefined, () => undefined), new Promise<void>((res) => setTimeout(res, ms))])

const decodeImg = (img: HTMLImageElement) => bestEffort(img.decode(), 2000)
const loadFont = (font: string) => bestEffort(document.fonts.load(font, 'Aa'), 1500)

/* ---- quad warp ---- */

export function homography(q: number[]) {
    const [x0, y0, x1, y1, x2, y2, x3, y3] = q
    const dx1 = x1 - x2, dx2 = x3 - x2, dy1 = y1 - y2, dy2 = y3 - y2
    const sx = x0 - x1 + x2 - x3, sy = y0 - y1 + y2 - y3
    const den = dx1 * dy2 - dx2 * dy1
    const g = (sx * dy2 - dx2 * sy) / den
    const h = (dx1 * sy - sx * dy1) / den
    return { a: x1 - x0 + g * x1, b: x3 - x0 + h * x3, d: y1 - y0 + g * y1, e: y3 - y0 + h * y3, g, h, x0, y0 }
}

/** CSS matrix3d that maps a W×H box onto the quad. */
export function quadMatrix(W: number, H: number, q: number[]) {
    const { a, b, d, e, g, h, x0, y0 } = homography(q)
    return `matrix3d(${a / W},${d / W},0,${g / W},${b / H},${e / H},0,${h / H},0,0,1,0,${x0},${y0},0,1)`
}

type Pt = [number, number]

function tri(ctx: CanvasRenderingContext2D, img: HTMLCanvasElement, s0: Pt, s1: Pt, s2: Pt, d0: Pt, d1: Pt, d2: Pt) {
    const cx = (d0[0] + d1[0] + d2[0]) / 3
    const cy = (d0[1] + d1[1] + d2[1]) / 3
    const grow = (p: Pt): Pt => {
        const dx = p[0] - cx, dy = p[1] - cy, l = Math.hypot(dx, dy) || 1
        return [p[0] + (dx / l) * 0.7, p[1] + (dy / l) * 0.7]
    }
    const [p0, p1, p2] = [grow(d0), grow(d1), grow(d2)]
    ctx.save()
    ctx.beginPath()
    ctx.moveTo(p0[0], p0[1])
    ctx.lineTo(p1[0], p1[1])
    ctx.lineTo(p2[0], p2[1])
    ctx.closePath()
    ctx.clip()
    const u1x = s1[0] - s0[0], u1y = s1[1] - s0[1], u2x = s2[0] - s0[0], u2y = s2[1] - s0[1]
    const v1x = d1[0] - d0[0], v1y = d1[1] - d0[1], v2x = d2[0] - d0[0], v2y = d2[1] - d0[1]
    const det = u1x * u2y - u2x * u1y
    const a = (v1x * u2y - v2x * u1y) / det
    const c = (v2x * u1x - v1x * u2x) / det
    const b = (v1y * u2y - v2y * u1y) / det
    const d = (v2y * u1x - v1y * u2x) / det
    ctx.transform(a, b, c, d, d0[0] - a * s0[0] - c * s0[1], d0[1] - b * s0[0] - d * s0[1])
    const xs = [s0[0], s1[0], s2[0]], ys = [s0[1], s1[1], s2[1]]
    const sx = Math.max(0, Math.floor(Math.min(...xs)) - 2)
    const sy = Math.max(0, Math.floor(Math.min(...ys)) - 2)
    const sw = Math.min(img.width - sx, Math.ceil(Math.max(...xs)) + 2 - sx)
    const sh = Math.min(img.height - sy, Math.ceil(Math.max(...ys)) + 2 - sy)
    ctx.drawImage(img, sx, sy, sw, sh, sx, sy, sw, sh)
    ctx.restore()
}

export function warp(ctx: CanvasRenderingContext2D, layer: HTMLCanvasElement, q: number[], n = 24) {
    const { a, b, d, e, g, h, x0, y0 } = homography(q)
    const map = (u: number, v: number): Pt => {
        const w = g * u + h * v + 1
        return [(a * u + b * v + x0) / w, (d * u + e * v + y0) / w]
    }
    const W = layer.width, H = layer.height
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
            const u0 = i / n, u1 = (i + 1) / n, v0 = j / n, v1 = (j + 1) / n
            const s: Pt[] = [[u0 * W, v0 * H], [u1 * W, v0 * H], [u1 * W, v1 * H], [u0 * W, v1 * H]]
            const t = [map(u0, v0), map(u1, v0), map(u1, v1), map(u0, v1)]
            tri(ctx, layer, s[0], s[1], s[2], t[0], t[1], t[2])
            tri(ctx, layer, s[0], s[2], s[3], t[0], t[2], t[3])
        }
    }
}

/* ---- fitting the haiku inside a board (same logic as App's fit) ---- */

const measureCtx = document.createElement('canvas').getContext('2d')

function inkBox(el: HTMLElement, lineH: number) {
    const st = getComputedStyle(el)
    measureCtx!.font = `${st.fontStyle} ${st.fontWeight} ${st.fontSize} ${st.fontFamily}`
    const raw = el.textContent ?? ''
    const m = measureCtx!.measureText(st.textTransform === 'uppercase' ? raw.toUpperCase() : raw)
    const base = (lineH - (m.fontBoundingBoxAscent + m.fontBoundingBoxDescent)) / 2 + m.fontBoundingBoxAscent
    return { top: base - m.actualBoundingBoxAscent, bottom: base + m.actualBoundingBoxDescent }
}

const fitted = new WeakMap<HTMLElement, { s: number; dy: number }>()

function fitBox(box: HTMLElement) {
    const els = [...box.querySelectorAll<HTMLElement>('[data-line]')]
    if (els.length !== 3) return
    const cs = getComputedStyle(box)
    const availW = box.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)
    const availH = box.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom)
    const gap = parseFloat(cs.rowGap) || 0
    const w: number[] = [], h: number[] = [], ih: number[] = [], dy: number[] = []
    for (const el of els) {
        el.style.transform = 'scale(1)'
        el.style.margin = '0'
        w.push(el.offsetWidth)
        h.push(el.offsetHeight)
        const ink = inkBox(el, el.offsetHeight)
        ih.push(Math.max(ink.bottom - ink.top, 1))
        dy.push((ink.top + ink.bottom) / 2 - el.offsetHeight / 2)
    }
    if (w.some((x) => x === 0)) return
    const { s, lead } = computeLayout({ availW, availH, gap, w, ih })
    els.forEach((el, i) => {
        fitted.set(el, { s: s[i], dy: dy[i] })
        el.style.transform = `translateY(${-s[i] * dy[i]}px) scale(${s[i]})`
        el.style.margin = `${(s[i] * ih[i] - h[i]) / 2 + lead / 2}px 0`
    })
}

const fontOf = (st: CSSStyleDeclaration, scale = 1) =>
    `${st.fontStyle} ${st.fontWeight} ${(parseFloat(st.fontSize) || 40) * scale}px ${st.fontFamily}`

/** Wait for the fonts the artboard uses, then fit every haiku box in it. */
async function prepare(ab: HTMLElement) {
    const els = [...ab.querySelectorAll<HTMLElement>('[data-line],[data-k]')]
    await Promise.all(els.map((el) => loadFont(fontOf(getComputedStyle(el)))))
    ab.querySelectorAll<HTMLElement>('[data-box]').forEach(fitBox)
}

/* ---- canvas drawing ---- */

function paperFill(ctx: CanvasRenderingContext2D, kind: string, W: number, H: number) {
    let g: CanvasGradient
    if (kind === 'sutro') {
        g = ctx.createLinearGradient(0, 0, 0, H)
        g.addColorStop(0, '#f3f3f1')
        g.addColorStop(0.7, '#ecedeb')
        g.addColorStop(1, '#e2e4e3')
    } else if (kind === 'day') {
        g = ctx.createLinearGradient(0, 0, W, 0)
        g.addColorStop(0, '#e6e9ec')
        g.addColorStop(0.45, '#eff1f2')
        g.addColorStop(1, '#f6f6f4')
    } else {
        g = ctx.createRadialGradient(W / 2, H * 1.1, 0, W / 2, H * 1.1, W * 0.62)
        g.addColorStop(0, '#fff6f2')
        g.addColorStop(0.55, '#f7e3e2')
        g.addColorStop(1, '#e9c9cc')
    }
    ctx.fillStyle = g
    ctx.fillRect(0, 0, W, H)
}

function edgeShade(ctx: CanvasRenderingContext2D, W: number, H: number, size: number, color: string) {
    const sides: number[][] = [
        [0, 0, 0, size, 0, 0, W, size],
        [0, H, 0, H - size, 0, H - size, W, size],
        [0, 0, size, 0, 0, 0, size, H],
        [W, 0, W - size, 0, W - size, 0, size, H],
    ]
    for (const [x0, y0, x1, y1, rx, ry, rw, rh] of sides) {
        const g = ctx.createLinearGradient(x0, y0, x1, y1)
        g.addColorStop(0, color)
        g.addColorStop(1, 'rgba(0,0,0,0)')
        ctx.fillStyle = g
        ctx.fillRect(rx, ry, rw, rh)
    }
}

function sheen(ctx: CanvasRenderingContext2D, W: number, H: number) {
    ctx.save()
    ctx.globalCompositeOperation = 'soft-light'
    const g = ctx.createLinearGradient(0, H * 0.4, W, H * 0.6)
    g.addColorStop(0, 'rgba(34,40,52,0.16)')
    g.addColorStop(0.3, 'rgba(34,40,52,0.06)')
    g.addColorStop(0.66, 'rgba(255,255,255,0.10)')
    g.addColorStop(1, 'rgba(255,252,244,0.18)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, W, H)
    ctx.restore()
}

function boardLayer(board: HTMLElement): HTMLCanvasElement {
    const W = board.offsetWidth, H = board.offsetHeight, kind = board.dataset.board!
    const c = document.createElement('canvas')
    c.width = W
    c.height = H
    const ctx = c.getContext('2d')!
    if (kind !== 'none') paperFill(ctx, kind, W, H)
    const box = board.querySelector<HTMLElement>('[data-box]')!
    for (const el of box.querySelectorAll<HTMLElement>('[data-line]')) {
        const st = getComputedStyle(el)
        const { s, dy } = fitted.get(el) ?? { s: 1, dy: 0 }
        const font = fontOf(st, s)
        ctx.font = font
        const m = ctx.measureText('Hg')
        ctx.save()
        ctx.translate(box.offsetLeft + el.offsetLeft + el.offsetWidth / 2, box.offsetTop + el.offsetTop + el.offsetHeight / 2 - s * dy)
        ctx.font = font
        ctx.letterSpacing = `${(parseFloat(st.letterSpacing) || 0) * s}px`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'alphabetic'
        ctx.globalAlpha = 0.92
        ctx.globalCompositeOperation = 'multiply'
        ctx.fillStyle = st.color
        if (st.textShadow !== 'none') {
            ctx.shadowColor = st.textShadow.match(/rgba?\([^)]+\)/)?.[0] ?? 'transparent'
            ctx.shadowBlur = 12
        }
        const raw = el.textContent ?? ''
        ctx.fillText(st.textTransform === 'uppercase' ? raw.toUpperCase() : raw, 0, (m.fontBoundingBoxAscent - m.fontBoundingBoxDescent) / 2)
        ctx.restore()
    }
    if (kind !== 'none') {
        if (kind !== 'night') sheen(ctx, W, H)
        edgeShade(ctx, W, H, 50, kind === 'night' ? 'rgba(120,30,50,0.16)' : 'rgba(40,48,60,0.12)')
    }
    return c
}

function drawText(ctx: CanvasRenderingContext2D, el: HTMLElement, align: CanvasTextAlign) {
    const st = getComputedStyle(el)
    ctx.save()
    ctx.font = `${st.fontStyle} ${st.fontWeight} ${st.fontSize} ${st.fontFamily}`
    ctx.fillStyle = st.color
    ctx.textBaseline = 'middle'
    ctx.textAlign = align
    if (st.textShadow !== 'none') {
        ctx.shadowColor = 'rgba(0,0,0,0.6)'
        ctx.shadowBlur = 5
    }
    const x = el.offsetLeft + (align === 'right' ? el.offsetWidth : el.offsetWidth / 2)
    ctx.fillText((el.textContent ?? '').trim(), x, el.offsetTop + el.offsetHeight / 2)
    ctx.restore()
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, r)
    else ctx.rect(x, y, w, h)
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
    if (photoBox) {
        const img = photoBox.querySelector('img')!
        const px = photoBox.offsetLeft, py = photoBox.offsetTop, pw = photoBox.offsetWidth, ph = photoBox.offsetHeight
        const t = document.createElement('canvas')
        t.width = pw * 2
        t.height = ph * 2
        const tc = t.getContext('2d')!
        tc.drawImage(img, 0, 0, t.width, t.height)
        const d = tc.getImageData(0, 0, t.width, t.height)
        for (let i = 0; i < d.data.length; i += 4) {
            d.data[i] = LUT[d.data[i]]
            d.data[i + 1] = LUT[d.data[i + 1]]
            d.data[i + 2] = LUT[d.data[i + 2]]
        }
        tc.putImageData(d, 0, 0)
        ctx.save()
        ctx.beginPath()
        roundRect(ctx, px, py, pw, ph, 12)
        ctx.clip()
        ctx.drawImage(t, px, py, pw, ph)
        const layer = boardLayer(board)
        ctx.translate(px + board.offsetLeft + board.offsetWidth / 2, py + board.offsetTop + board.offsetHeight / 2)
        ctx.rotate((-0.28 * Math.PI) / 180)
        ctx.translate(-board.offsetWidth / 2, -board.offsetHeight / 2)
        ctx.globalCompositeOperation = 'multiply'
        ctx.drawImage(layer, 0, 0)
        ctx.globalCompositeOperation = 'source-over'
        sheen(ctx, board.offsetWidth, board.offsetHeight)
        edgeShade(ctx, board.offsetWidth, board.offsetHeight, 50, 'rgba(40,48,60,0.10)')
        ctx.restore()
        texts.forEach((el) => drawText(ctx, el, 'center'))
    } else {
        const img = ab.querySelector('img')!
        ctx.drawImage(img, img.offsetLeft, img.offsetTop, img.offsetWidth, img.offsetHeight)
        const layer = boardLayer(board)
        const q = board.dataset.quad?.split(',').map(Number)
        if (q) {
            if (board.dataset.board === 'night') {
                ctx.save()
                ctx.shadowColor = 'rgba(255,170,190,0.35)'
                ctx.shadowBlur = 60
                ctx.fillStyle = '#f2dcdd'
                ctx.beginPath()
                ctx.moveTo(q[0], q[1])
                ctx.lineTo(q[2], q[3])
                ctx.lineTo(q[4], q[5])
                ctx.lineTo(q[6], q[7])
                ctx.closePath()
                ctx.fill()
                ctx.restore()
            }
            warp(ctx, layer, q)
        } else ctx.drawImage(layer, board.offsetLeft, board.offsetTop)
        texts.forEach((el) => drawText(ctx, el, 'right'))
    }
    return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('toBlob failed'))), 'image/png'))
}

/** Render one mounted artboard to a 1080×1350 PNG, giving up after 10s. */
export const renderArtboard = (ab: HTMLElement) => withTimeout(drawArtboard(ab), 10000)
