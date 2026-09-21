export interface LayoutInput {
    availW: number
    availH: number
    gap: number
    w: number[]
    ih: number[]
}

export interface LayoutResult {
    s: number[]
    lead: number
}

const MAX_SCALE = 6
const OUTER_RATIOS = [0.88, 0.8, 0.72, 0.62, 0.52, 0.42]
const OUTER_SHRINK = 0.85
const MID_MAX_HEIGHT = 0.36
const MIN_FILL = 0.78
const BASE_LEAD = 0.07
const MAX_LEAD = 0.16

export function computeLayout({ availW, availH, gap, w, ih }: LayoutInput): LayoutResult {
    const baseLead = availH * BASE_LEAD
    const budget = availH - baseLead * 3 - gap * 2
    let s = [1, 1, 1]
    for (const ratio of OUTER_RATIOS) {
        const fullMid = Math.min(availW / w[1], MAX_SCALE)
        const mid = Math.min(fullMid, (MID_MAX_HEIGHT * budget) / ih[1])
        const target = OUTER_SHRINK * ratio * fullMid * w[1]
        s = [Math.min(target / w[0], MAX_SCALE), mid, Math.min(target / w[2], MAX_SCALE)]
        const total = s[0] * ih[0] + s[1] * ih[1] + s[2] * ih[2]
        if (total > budget) {
            const left = budget - s[1] * ih[1]
            if (left > 0.22 * budget) {
                const outer = s[0] * ih[0] + s[2] * ih[2]
                const k = left / outer
                s = [s[0] * k, s[1], s[2] * k]
            } else {
                const k = Math.max(budget / total, 0.2)
                s = s.map((x) => x * k)
            }
        }
        if (mid < fullMid || s[1] * w[1] >= 0.75 * availW) break
    }
    const inkTotal = s[0] * ih[0] + s[1] * ih[1] + s[2] * ih[2]
    const spread = inkTotal < MIN_FILL * availH ? (availH - gap * 2 - inkTotal) / 3 : 0
    const lead = Math.max(baseLead, Math.min(spread, availH * MAX_LEAD))
    return { s, lead }
}
