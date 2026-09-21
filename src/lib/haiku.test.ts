import {
  type Phrase,
  type Haiku,
  type Rng,
  generateHaiku,
  rerollLine,
  rerollAll,
  parseShareParam,
  formatShareParam,
} from './haiku'

const mk = (n: number, count: number, prefix: string): Phrase[] =>
  Array.from({ length: count }, (_, i) => ({
    id: `${prefix}${i + 1}`,
    text: `${prefix} text ${i + 1}`,
    syllables: n as 5 | 7,
  }))

const five = mk(5, 3, 'f')
const seven = mk(7, 2, 's')
const minimal = [...five, ...seven]

const seq = (...vals: number[]): Rng => {
  let i = 0
  return () => vals[i++ % vals.length]
}
const rand = (seed: number): Rng => {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296
    return s / 4294967296
  }
}
const ids = (h: Haiku) => h.map((p) => p.id)

describe('generateHaiku', () => {
  it('picks 5/7/5 with distinct lines 1 and 3, even at minimum pool sizes', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const h = generateHaiku(minimal, rand(seed))
      expect(h.map((p) => p.syllables)).toEqual([5, 7, 5])
      expect(h[0].id).not.toBe(h[2].id)
    }
  })

  it('is deterministic given the rng', () => {
    expect(ids(generateHaiku(minimal, seq(0, 0, 0)))).toEqual(['f1', 's1', 'f2'])
  })
})

describe('rerollLine', () => {
  const current = generateHaiku(minimal, seq(0, 0, 0)) // f1 s1 f2

  it('changes only the requested line to a different phrase', () => {
    for (let seed = 1; seed <= 100; seed++) {
      const next = rerollLine(minimal, current, 1, rand(seed))
      expect(next[1].id).toBe('s2')
      expect(next[0]).toBe(current[0])
      expect(next[2]).toBe(current[2])
    }
  })

  it('line 1 never matches current line 3 or itself', () => {
    for (let seed = 1; seed <= 100; seed++) {
      expect(ids(rerollLine(minimal, current, 0, rand(seed)))[0]).toBe('f3')
      expect(ids(rerollLine(minimal, current, 2, rand(seed)))[2]).toBe('f3')
    }
  })
})

describe('rerollAll', () => {
  const current = generateHaiku(minimal, seq(0, 0, 0)) // f1 s1 f2
  const none = [false, false, false] as const

  it('changes every unlocked line and keeps 1 != 3', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const next = rerollAll(minimal, current, none, rand(seed))
      expect(next[0].id).not.toBe(current[0].id)
      expect(next[1].id).not.toBe(current[1].id)
      expect(next[2].id).not.toBe(current[2].id)
      expect(next[0].id).not.toBe(next[2].id)
    }
  })

  it('leaves locked lines untouched and excludes them from the other 5-syllable line', () => {
    for (let seed = 1; seed <= 100; seed++) {
      const next = rerollAll(minimal, current, [true, false, false], rand(seed))
      expect(next[0]).toBe(current[0])
      expect(next[1].id).toBe('s2')
      expect(next[2].id).toBe('f3')
    }
    for (let seed = 1; seed <= 100; seed++) {
      const next = rerollAll(minimal, current, [false, false, true], rand(seed))
      expect(next[2]).toBe(current[2])
      expect(next[0].id).toBe('f3')
    }
  })

  it('returns the same haiku when everything is locked', () => {
    expect(ids(rerollAll(minimal, current, [true, true, true], rand(1)))).toEqual(ids(current))
  })
})

describe('share param', () => {
  const h = generateHaiku(minimal, seq(0, 0, 0))

  it('round-trips', () => {
    expect(formatShareParam(h)).toBe('f1,s1,f2')
    expect(ids(parseShareParam(minimal, 'f1,s1,f2')!)).toEqual(['f1', 's1', 'f2'])
  })

  it.each([
    ['null', null],
    ['empty', ''],
    ['two ids', 'f1,s1'],
    ['four ids', 'f1,s1,f2,f3'],
    ['unknown id', 'f1,s1,zzz'],
    ['wrong pool on line 1', 's1,s2,f1'],
    ['wrong pool on line 2', 'f1,f2,f3'],
    ['duplicate 1 and 3', 'f1,s1,f1'],
    ['whitespace garbage', ' , , '],
  ])('rejects %s', (_name, value) => {
    expect(parseShareParam(minimal, value)).toBeNull()
  })
})
