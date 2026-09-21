import { computeLayout } from './layout'

const base = { availW: 1000, availH: 300, gap: 2 }
const inkSum = (s: number[], ih: number[]) => s.reduce((a, x, i) => a + x * ih[i], 0)

describe('computeLayout', () => {
    it('stretches a long middle line to the full width', () => {
        const { s } = computeLayout({ ...base, w: [300, 500, 300], ih: [30, 30, 30] })
        expect(s[1] * 500).toBeCloseTo(1000, 0)
    })

    it('caps a short middle line so it does not dominate the height', () => {
        const ih = [30, 30, 30]
        const { s } = computeLayout({ ...base, w: [400, 60, 400], ih })
        const budget = base.availH - base.availH * 0.07 * 3 - base.gap * 2
        expect(s[1] * ih[1]).toBeLessThanOrEqual(0.36 * budget + 0.001)
        expect(s[1] * 60).toBeLessThan(1000)
    })

    it('keeps the outer lines smaller than the middle line when it fills the width', () => {
        const { s } = computeLayout({ ...base, w: [300, 500, 300], ih: [30, 30, 30] })
        expect(s[0] * 300).toBeLessThan(s[1] * 500 * 0.85 + 0.001)
        expect(s[2] * 300).toBeLessThan(s[1] * 500 * 0.85 + 0.001)
    })

    it('never overflows the available height', () => {
        for (const w of [[300, 500, 300], [400, 60, 400], [900, 100, 900], [50, 800, 50]]) {
            const ih = [40, 40, 40]
            const { s, lead } = computeLayout({ ...base, w, ih })
            expect(inkSum(s, ih) + lead * 3 + base.gap * 2).toBeLessThanOrEqual(base.availH + 0.001)
        }
    })

    it('uses the base spacing when the lines fill enough of the height', () => {
        const { lead } = computeLayout({ ...base, w: [300, 500, 300], ih: [60, 60, 60] })
        expect(lead).toBeCloseTo(base.availH * 0.07, 5)
    })

    it('spreads the lines apart when they fill too little of the height', () => {
        const { s, lead } = computeLayout({ ...base, w: [400, 60, 400], ih: [10, 10, 10] })
        expect(inkSum(s, [10, 10, 10])).toBeLessThan(0.78 * base.availH)
        expect(lead).toBeGreaterThan(base.availH * 0.07)
    })

    it('caps the extra spacing at 16% of the height', () => {
        const { lead } = computeLayout({ ...base, w: [4000, 3000, 4000], ih: [1, 1, 1] })
        expect(lead).toBeLessThanOrEqual(base.availH * 0.16 + 0.001)
    })
})
