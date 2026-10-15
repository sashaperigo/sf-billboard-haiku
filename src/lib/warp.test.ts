import { PAPER_H, PAPER_W, QUADS, SHARE_OPTIONS, quadMatrix, shareFileName } from './shareImage'
import { type Pt, homography, tri, warp } from './warp'

/** Parse a CSS matrix3d(...) string and apply it to a point, including the perspective divide. */
function applyMatrix3d(css: string, x: number, y: number): [number, number] {
    const m = css.match(/^matrix3d\((.*)\)$/)![1].split(',').map(Number)
    expect(m).toHaveLength(16)
    const w = m[3] * x + m[7] * y + m[15]
    return [(m[0] * x + m[4] * y + m[12]) / w, (m[1] * x + m[5] * y + m[13]) / w]
}

const corners = (W: number, H: number): [number, number][] => [[0, 0], [W, 0], [W, H], [0, H]]

describe('quadMatrix', () => {
    const quads: Record<string, [number, number, number[]]> = {
        'day photo quad': [PAPER_W, PAPER_H, QUADS.day],
        'night photo quad': [PAPER_W, PAPER_H, QUADS.night],
        'axis-aligned rectangle': [200, 100, [10, 20, 210, 20, 210, 120, 10, 120]],
        'parallelogram (affine)': [200, 100, [0, 0, 200, 0, 250, 100, 50, 100]],
        'strong perspective': [300, 150, [40, 30, 260, 0, 300, 200, 0, 170]],
        'unit-size box': [1, 1, [5, 5, 9, 6, 8, 11, 4, 9]],
    }

    it.each(Object.entries(quads))('maps the four box corners onto the quad corners: %s', (_name, [W, H, q]) => {
        const css = quadMatrix(W, H, q)
        corners(W, H).forEach(([x, y], i) => {
            const [px, py] = applyMatrix3d(css, x, y)
            expect(px).toBeCloseTo(q[2 * i], 6)
            expect(py).toBeCloseTo(q[2 * i + 1], 6)
        })
    })

    it('keeps the center of the box inside the quad (convex mapping)', () => {
        for (const q of [QUADS.day, QUADS.night]) {
            const [cx, cy] = applyMatrix3d(quadMatrix(PAPER_W, PAPER_H, q), PAPER_W / 2, PAPER_H / 2)
            const xs = [q[0], q[2], q[4], q[6]], ys = [q[1], q[3], q[5], q[7]]
            expect(cx).toBeGreaterThan(Math.min(...xs))
            expect(cx).toBeLessThan(Math.max(...xs))
            expect(cy).toBeGreaterThan(Math.min(...ys))
            expect(cy).toBeLessThan(Math.max(...ys))
        }
    })

    it('maps straight lines to straight lines (projective): points on the top edge stay on the top edge', () => {
        const q = QUADS.day
        const css = quadMatrix(PAPER_W, PAPER_H, q)
        const [x, y] = applyMatrix3d(css, PAPER_W / 3, 0)
        // Collinear with the TL→TR edge.
        const cross = (q[2] - q[0]) * (y - q[1]) - (q[3] - q[1]) * (x - q[0])
        expect(Math.abs(cross)).toBeLessThan(1e-6)
    })

    it('has exactly the pinned matrix for the shipped quads', () => {
        expect(quadMatrix(PAPER_W, PAPER_H, QUADS.day)).toMatchInlineSnapshot(`"matrix3d(0.6591113861386142,-0.2013457920792078,0,-0.00016707920792079177,0,0.9219178082191782,0,0,0,0,1,0,125.5,428.4,0,1)"`)
        expect(quadMatrix(PAPER_W, PAPER_H, QUADS.night)).toMatchInlineSnapshot(`"matrix3d(0.9330808433579098,0.0778535118354676,0,0.00008504721252101927,-0.008573141469737942,0.931052366467023,0,-0.000014547058238352671,0,0,1,0,120.5,462.5,0,1)"`)
    })
})

describe('share options', () => {
    it('has unique ids and slugs', () => {
        expect(new Set(SHARE_OPTIONS.map((o) => o.id)).size).toBe(SHARE_OPTIONS.length)
        expect(new Set(SHARE_OPTIONS.map((o) => o.slug)).size).toBe(SHARE_OPTIONS.length)
    })

    it.each(SHARE_OPTIONS)('names the download file for $id', ({ id, slug }) => {
        expect(shareFileName(id)).toBe(`billboard-haiku-${slug}-4x5.png`)
    })
})

describe('homography', () => {
    it('is the identity-like affine map for an axis-aligned rectangle (no perspective terms)', () => {
        const { g, h, a, b, d, e, x0, y0 } = homography([10, 20, 210, 20, 210, 120, 10, 120])
        ;[g, h].forEach((v) => expect(v).toBeCloseTo(0, 12))
        const got = [a, b, d, e, x0, y0]
        ;[200, 0, 0, 100, 10, 20].forEach((v, i) => expect(got[i]).toBeCloseTo(v, 9))
    })

    it('introduces perspective terms for a trapezoid', () => {
        const { g, h } = homography([0, 0, 100, 20, 100, 80, 0, 100])
        expect(Math.abs(g)).toBeGreaterThan(1e-6)
        expect(h).toBeCloseTo(0, 12)
    })
})

/* ---- tri / warp against a recording 2D context ---- */

function fakeCtx() {
    const calls: [string, ...number[]][] = []  // drawImage's first arg (the layer) is not a number, but is never read
    const rec = (name: string) => (...a: unknown[]) => void calls.push([name, ...a] as [string, ...number[]])
    const ctx = {
        save: rec('save'), restore: rec('restore'), beginPath: rec('beginPath'), closePath: rec('closePath'),
        moveTo: rec('moveTo'), lineTo: rec('lineTo'), clip: rec('clip'), transform: rec('transform'), drawImage: rec('drawImage'),
    }
    return { ctx: ctx as unknown as CanvasRenderingContext2D, calls, of: (n: string) => calls.filter((c) => c[0] === n) }
}
const layer = (w: number, h: number) => ({ width: w, height: h }) as HTMLCanvasElement

describe('tri', () => {
    it('applies the affine transform that sends the source triangle onto the destination triangle', () => {
        const { ctx, of } = fakeCtx()
        const s: Pt[] = [[0, 0], [100, 0], [0, 50]]
        const d: Pt[] = [[10, 20], [210, 30], [0, 120]]
        tri(ctx, layer(100, 50), s[0], s[1], s[2], d[0], d[1], d[2])
        const [, a, b, c, dd, e, f] = of('transform')[0]
        s.forEach(([x, y], i) => {
            expect(a * x + c * y + e).toBeCloseTo(d[i][0], 9)
            expect(b * x + dd * y + f).toBeCloseTo(d[i][1], 9)
        })
    })

    it('clips to the destination triangle grown ~0.7px outward to hide seams', () => {
        const { ctx, of } = fakeCtx()
        tri(ctx, layer(100, 100), [0, 0], [100, 0], [0, 100], [0, 0], [100, 0], [0, 100])
        const pts = [of('moveTo')[0], ...of('lineTo')].map(([, x, y]) => [x, y])
        const orig = [[0, 0], [100, 0], [0, 100]]
        const cx = 100 / 3, cy = 100 / 3
        pts.forEach(([x, y], i) => {
            const before = Math.hypot(orig[i][0] - cx, orig[i][1] - cy)
            expect(Math.hypot(x - cx, y - cy) - before).toBeCloseTo(0.7, 9)
        })
        expect(of('clip')).toHaveLength(1)
    })

    it('saves and restores exactly once and samples a source rect inside the layer', () => {
        const { ctx, of } = fakeCtx()
        tri(ctx, layer(100, 50), [90, 40], [100, 40], [100, 50], [0, 0], [10, 0], [10, 10])
        expect(of('save')).toHaveLength(1)
        expect(of('restore')).toHaveLength(1)
        const [, , sx, sy, sw, sh, dx, dy, dw, dh] = of('drawImage')[0]
        expect([sx, sy, sw, sh]).toEqual([dx, dy, dw, dh])
        expect(sx).toBeGreaterThanOrEqual(0)
        expect(sy).toBeGreaterThanOrEqual(0)
        expect(sx + sw).toBeLessThanOrEqual(100)
        expect(sy + sh).toBeLessThanOrEqual(50)
    })
})

describe('warp', () => {
    it('draws two triangles per grid cell', () => {
        for (const n of [1, 4, 24]) {
            const { ctx, of } = fakeCtx()
            warp(ctx, layer(200, 80), QUADS.day, n)
            expect(of('drawImage')).toHaveLength(2 * n * n)
        }
    })

    it('uses a 24×24 mesh by default', () => {
        const { ctx, of } = fakeCtx()
        warp(ctx, layer(200, 80), QUADS.night)
        expect(of('drawImage')).toHaveLength(2 * 24 * 24)
    })

    it('lands the layer corners on the quad corners', () => {
        // With a 1×1 mesh the two triangles' outer vertices are the quad corners.
        const { ctx, of } = fakeCtx()
        const q = QUADS.day
        warp(ctx, layer(1000, 292), q, 1)
        const [first, second] = of('transform')
        const tl = [first[5], first[6]], br = [
            second[1] * 1000 + second[3] * 292 + second[5],
            second[2] * 1000 + second[4] * 292 + second[6],
        ]
        expect(tl[0]).toBeCloseTo(q[0], 6)
        expect(tl[1]).toBeCloseTo(q[1], 6)
        expect(br[0]).toBeCloseTo(q[4], 6)
        expect(br[1]).toBeCloseTo(q[5], 6)
    })
})
