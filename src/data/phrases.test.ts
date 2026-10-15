import phrases from './phrases.json'

const normalizeText = (text: string) =>
  text
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, '')

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

  it('has no near-duplicate text, ignoring case, punctuation and whitespace', () => {
    const seen = new Map<string, string>()
    const dupes: string[] = []
    for (const p of phrases) {
      const key = normalizeText(p.text)
      const prior = seen.get(key)
      if (prior) dupes.push(`${p.id} "${p.text}" duplicates ${prior}`)
      else seen.set(key, `${p.id} "${p.text}"`)
    }
    expect(dupes).toEqual([])
  })

  it('normalizeText ignores case, punctuation, whitespace and accents', () => {
    const variants = ['Everyone is a coder', 'everyone is a coder.', '  EVERYONE   is a\tcoder!  ', 'Everyone-is-a coder']
    expect(new Set(variants.map(normalizeText)).size).toBe(1)
    expect(normalizeText("Don\u2019t")).toBe(normalizeText("don't"))
    expect(normalizeText('Reveló')).toBe(normalizeText('revelo'))
    expect(normalizeText('Stop hiring humans')).not.toBe(normalizeText('Stop hirring humans'))
  })

  it('has enough phrases for the selection rules', () => {
    expect(ofSize(5).length).toBeGreaterThanOrEqual(3)
    expect(ofSize(7).length).toBeGreaterThanOrEqual(2)
  })
})
