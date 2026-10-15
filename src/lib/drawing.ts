import { fitted, fontOf } from './shareFit'
import { warp } from './warp'

const LUT = Array.from({ length: 256 }, (_, v) => Math.round(255 * (v / 255) ** 0.65))

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

/** Apply the same shadow-lifting gamma as the on-page `lift-shadows` filter to a photo. */
function liftedPhoto(img: HTMLImageElement, w: number, h: number) {
    const c = document.createElement('canvas')
    c.width = w * 2
    c.height = h * 2
    const cc = c.getContext('2d')!
    cc.drawImage(img, 0, 0, c.width, c.height)
    const d = cc.getImageData(0, 0, c.width, c.height)
    for (let i = 0; i < d.data.length; i += 4) {
        d.data[i] = LUT[d.data[i]]
        d.data[i + 1] = LUT[d.data[i + 1]]
        d.data[i + 2] = LUT[d.data[i + 2]]
    }
    cc.putImageData(d, 0, 0)
    return c
}

/** Classic layout: the lifted photo with the haiku board sitting on it, captions centered below. */
export function drawPhotoArtboard(ctx: CanvasRenderingContext2D, photoBox: HTMLElement, board: HTMLElement, texts: HTMLElement[]) {
    const px = photoBox.offsetLeft, py = photoBox.offsetTop, pw = photoBox.offsetWidth, ph = photoBox.offsetHeight
    const photo = liftedPhoto(photoBox.querySelector('img')!, pw, ph)
    ctx.save()
    ctx.beginPath()
    roundRect(ctx, px, py, pw, ph, 12)
    ctx.clip()
    ctx.drawImage(photo, px, py, pw, ph)
    const layer = boardLayer(board)
    // The board is tilted slightly (see the data-board style in ShareArtboards), so rotate about its center.
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
}

/** Fill the quad with a soft pink glow, as if the night billboard were lit from within. */
function glowQuad(ctx: CanvasRenderingContext2D, q: number[]) {
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

/** Full-bleed photo layouts: the board is flat on the photo (sutro) or warped onto a quad (day, night). */
export function drawBillboardArtboard(ctx: CanvasRenderingContext2D, ab: HTMLElement, board: HTMLElement, texts: HTMLElement[]) {
    const img = ab.querySelector('img')!
    ctx.drawImage(img, img.offsetLeft, img.offsetTop, img.offsetWidth, img.offsetHeight)
    const layer = boardLayer(board)
    const q = board.dataset.quad?.split(',').map(Number)
    if (q) {
        if (board.dataset.board === 'night') glowQuad(ctx, q)
        warp(ctx, layer, q)
    } else ctx.drawImage(layer, board.offsetLeft, board.offsetTop)
    texts.forEach((el) => drawText(ctx, el, 'right'))
}
