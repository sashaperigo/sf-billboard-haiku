import { fitLines } from './fit'

export const fitted = new WeakMap<HTMLElement, { s: number; dy: number }>()

function fitBox(box: HTMLElement) {
    const els = [...box.querySelectorAll<HTMLElement>('[data-line]')]
    if (els.length !== 3) return
    fitLines(box, els)?.forEach((f, i) => fitted.set(els[i], f))
}

export const fontOf = (st: CSSStyleDeclaration, scale = 1) =>
    `${st.fontStyle} ${st.fontWeight} ${(parseFloat(st.fontSize) || 40) * scale}px ${st.fontFamily}`

/** Fit every haiku box in an artboard (needs its fonts loaded first). */
export const fitBoxes = (ab: HTMLElement) => ab.querySelectorAll<HTMLElement>('[data-box]').forEach(fitBox)
