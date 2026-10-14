import { FACES, INKS, colorOf, plainCss, formatStyleParam, parseStyleParam, restyle, type Trio } from './style'

describe('style param', () => {
  const style = { faces: [3, 10, 20] as Trio, inks: [1, 2, 3] as Trio }

  it('round-trips', () => {
    expect(formatStyleParam(style)).toBe('3.1,10.2,20.3')
    expect(parseStyleParam('3.1,10.2,20.3')).toEqual(style)
  })

  it.each([
    ['null', null],
    ['empty', ''],
    ['two entries', '3.1,10.2'],
    ['four entries', '3.1,10.2,20.3,0.0'],
    ['non-numeric', 'a.b,10.2,20.3'],
    ['face index out of range', `${FACES.length}.0,0.0,0.0`],
    ['ink index out of range', `0.${INKS.length},0.0,0.0`],
    ['garbage', ' , , '],
  ])('rejects %s', (_name, value) => {
    expect(parseStyleParam(value)).toBeNull()
  })
})

describe('colorOf', () => {
  it('prefers a face-fixed ink over the palette index', () => {
    const fixedFace = FACES.findIndex((f) => f.ink !== undefined)
    expect(colorOf(fixedFace, 0)).toBe(FACES[fixedFace].ink)
  })

  it('falls back to the ink palette when the face has no fixed ink', () => {
    const plainFace = FACES.findIndex((f) => f.ink === undefined)
    expect(colorOf(plainFace, 2)).toBe(INKS[2])
  })
})

describe('restyle', () => {
  it('leaves untouched indices exactly as given', () => {
    const start = { faces: [0, 1, 2] as Trio, inks: [0, 1, 2] as Trio }
    const next = restyle(start.faces, start.inks, [1])
    expect(next.faces[0]).toBe(start.faces[0])
    expect(next.faces[2]).toBe(start.faces[2])
    expect(next.inks[0]).toBe(start.inks[0])
    expect(next.inks[2]).toBe(start.inks[2])
  })

  it('picks valid indices for restyled lines', () => {
    const next = restyle([0, 1, 2], [0, 1, 2], [0, 1, 2])
    for (const f of next.faces) expect(f).toBeGreaterThanOrEqual(0)
    for (const f of next.faces) expect(f).toBeLessThan(FACES.length)
    for (const c of next.inks) expect(c).toBeGreaterThanOrEqual(0)
    for (const c of next.inks) expect(c).toBeLessThan(INKS.length)
  })
})

describe('plainCss', () => {
  const style = { faces: [3, 10, 20] as Trio, inks: [1, 2, 3] as Trio }

  it('keeps the face, ink and spacing of lineCss but sizes in px scaled by the face', () => {
    const css = plainCss(style, 1, 19)
    expect(css.fontFamily).toContain(FACES[10].family)
    expect(css.color).toBe(colorOf(10, 2))
    expect(css.fontSize).toBe(`calc(19px * ${FACES[10].size})`)
  })
})
