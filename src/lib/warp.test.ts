import { PAPER_H, PAPER_W, QUADS, SHARE_OPTIONS, quadMatrix, shareFileName } from './shareImage'

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
