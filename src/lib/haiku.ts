export type Syllables = 5 | 7
export interface Phrase {
  id: string
  text: string
  syllables: Syllables
}
export type Haiku = [Phrase, Phrase, Phrase]
export type Locks = readonly [boolean, boolean, boolean]
export type Rng = () => number

const LINE_SYLLABLES: Syllables[] = [5, 7, 5]

const pick = (pool: Phrase[], excludeIds: (string | undefined)[], rng: Rng): Phrase => {
  const eligible = pool.filter((p) => !excludeIds.includes(p.id))
  return eligible[Math.min(Math.floor(rng() * eligible.length), eligible.length - 1)]
}

const poolFor = (phrases: Phrase[], line: number) =>
  phrases.filter((p) => p.syllables === LINE_SYLLABLES[line])

export function generateHaiku(phrases: Phrase[], rng: Rng): Haiku {
  const l1 = pick(poolFor(phrases, 0), [], rng)
  const l2 = pick(poolFor(phrases, 1), [], rng)
  const l3 = pick(poolFor(phrases, 2), [l1.id], rng)
  return [l1, l2, l3]
}

const otherFiveLine = (line: number) => (line === 0 ? 2 : 0)

export function rerollLine(phrases: Phrase[], current: Haiku, line: 0 | 1 | 2, rng: Rng): Haiku {
  const exclude = [current[line].id]
  if (line !== 1) exclude.push(current[otherFiveLine(line)].id)
  const next = [...current] as Haiku
  next[line] = pick(poolFor(phrases, line), exclude, rng)
  return next
}

export function rerollAll(phrases: Phrase[], current: Haiku, locks: Locks, rng: Rng): Haiku {
  const next = [...current] as Haiku
  for (const line of [0, 1, 2] as const) {
    if (locks[line]) continue
    const exclude = [current[line].id]
    if (line !== 1) exclude.push(next[otherFiveLine(line)].id)
    next[line] = pick(poolFor(phrases, line), exclude, rng)
  }
  return next
}

export const formatShareParam = (h: Haiku) => h.map((p) => p.id).join(',')

export function parseShareParam(phrases: Phrase[], value: string | null): Haiku | null {
  if (!value) return null
  const parts = value.split(',')
  if (parts.length !== 3) return null
  const found = parts.map((id) => phrases.find((p) => p.id === id))
  if (found.some((p) => !p)) return null
  const h = found as Haiku
  if (h.some((p, i) => p.syllables !== LINE_SYLLABLES[i])) return null
  if (h[0].id === h[2].id) return null
  return h
}
