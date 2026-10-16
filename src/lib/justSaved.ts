const KEY = 'justSavedHaikuId'
const TTL_MS = 60_000

export interface JustSaved {
  id: string
  /** ms left before the "just saved" tag should disappear */
  remaining: number
}

export function getJustSaved(): JustSaved | null {
  try {
    const raw = sessionStorage.getItem(KEY)
    if (!raw) return null
    const { id, at } = JSON.parse(raw) as { id?: unknown; at?: unknown }
    if (typeof id !== 'string' || typeof at !== 'number') return null
    const remaining = at + TTL_MS - Date.now()
    return remaining > 0 ? { id, remaining } : null
  } catch {
    return null
  }
}

export function setJustSavedId(id: string) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ id, at: Date.now() }))
  } catch {
    // sessionStorage unavailable — the "just saved" tag is cosmetic.
  }
}
