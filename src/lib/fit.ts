import { computeLayout } from './layout'

const measureCtx = document.createElement('canvas').getContext('2d')!

/**
 * Where a line's glyphs sit inside its line box, measured from the canvas font metrics.
 * Spans cap height to baseline (not the text's full ink), so descenders and tall ascenders
 * don't make the gap look bigger or smaller depending on which letters a line happens to have.
 */
function inkBox(el: HTMLElement, lineH: number) {
    const st = getComputedStyle(el)
    measureCtx.font = `${st.fontStyle} ${st.fontWeight} ${st.fontSize} ${st.fontFamily}`
    const m = measureCtx.measureText('H')
    const raw = el.textContent ?? ''
    const t = measureCtx.measureText(st.textTransform === 'uppercase' ? raw.toUpperCase() : raw)
    const base = (lineH - (m.fontBoundingBoxAscent + m.fontBoundingBoxDescent)) / 2 + m.fontBoundingBoxAscent
    return {
        top: base - m.actualBoundingBoxAscent,
        bottom: base,
        // how far the actual glyphs poke past the cap/baseline band
        below: Math.max(0, t.actualBoundingBoxDescent),
        above: Math.max(0, t.actualBoundingBoxAscent - m.actualBoundingBoxAscent),
    }
}

/**
 * Scale and re-space the haiku lines so their ink (not their line boxes) fills `box`.
 * Applies the transform/margin to each element and returns the per-line scale `s` and
 * ink-center offset `dy`, or null if the box isn't measurable yet (hidden, fonts not loaded).
 */
export function fitLines(box: HTMLElement, els: HTMLElement[]): { s: number; dy: number }[] | null {
    const cs = getComputedStyle(box)
    const availW = box.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)
    const availH = box.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom)
    const gap = parseFloat(cs.rowGap) || 0
    if (availW <= 0 || availH <= 0) return null
    const w: number[] = [], h: number[] = [], ih: number[] = [], dy: number[] = []
    const below: number[] = [], above: number[] = []
    for (const el of els) {
        // Reset first so we measure the natural, unscaled size.
        el.style.transform = 'scale(1)'
        el.style.margin = '0'
        w.push(el.offsetWidth)
        h.push(el.offsetHeight)
        const ink = inkBox(el, el.offsetHeight)
        ih.push(Math.max(ink.bottom - ink.top, 1))
        below.push(ink.below)
        above.push(ink.above)
        dy.push((ink.top + ink.bottom) / 2 - el.offsetHeight / 2)
    }
    if (w.some((x) => x === 0)) return null
    let { s, lead } = computeLayout({ availW, availH, gap, w, ih })
    // Descenders / tall ascenders hang outside the cap-to-baseline band; keep them off the neighbouring line.
    const clearance = (sc: number[]) =>
        Math.max(0, ...[0, 1].map((i) => sc[i] * below[i] + sc[i + 1] * above[i + 1] + 4 - gap))
    const needed = clearance(s)
    if (needed > lead) {
        const k = Math.min(1, availH / (s[0] * ih[0] + s[1] * ih[1] + s[2] * ih[2] + gap * 2 + needed * 3))
        s = s.map((x) => x * k)
        lead = Math.max(lead, clearance(s))
    }
    els.forEach((el, i) => {
        el.style.transform = `translateY(${-s[i] * dy[i]}px) scale(${s[i]})`
        el.style.margin = `${(s[i] * ih[i] - h[i]) / 2 + lead / 2}px 0`
    })
    return els.map((_, i) => ({ s: s[i], dy: dy[i] }))
}
