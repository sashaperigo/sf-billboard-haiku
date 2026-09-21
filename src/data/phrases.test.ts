import phrases from './phrases.json'

const ofSize = (n: number) => phrases.filter((p) => p.syllables === n)

describe('phrases.json', () => {
  it('has unique ids with allowed characters', () => {
    const ids = phrases.map((p) => p.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const id of ids) expect(id).toMatch(/^[a-z0-9-]+$/)
  })

  it('only uses 5 or 7 syllables', () => {
    for (const p of phrases) expect([5, 7]).toContain(p.syllables)
  })

  it('has non-empty text', () => {
    for (const p of phrases) expect(p.text.trim()).not.toBe('')
  })

  it('has no duplicate text within a syllable pool', () => {
    for (const n of [5, 7]) {
      const texts = ofSize(n).map((p) => p.text)
      expect(new Set(texts).size).toBe(texts.length)
    }
  })

  it('has enough phrases for the selection rules', () => {
    expect(ofSize(5).length).toBeGreaterThanOrEqual(3)
    expect(ofSize(7).length).toBeGreaterThanOrEqual(2)
  })
})
