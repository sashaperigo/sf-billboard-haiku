/* Perspective warping of a flat layer onto a quad: CSS matrix for the live page, triangle mesh for canvas. */

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

export type Pt = [number, number]

export function tri(ctx: CanvasRenderingContext2D, img: HTMLCanvasElement, s0: Pt, s1: Pt, s2: Pt, d0: Pt, d1: Pt, d2: Pt) {
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
