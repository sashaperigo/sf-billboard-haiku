const KEY = 'justSavedHaikuId'

export function getJustSavedId(): string | null {
  try {
    return sessionStorage.getItem(KEY)
  } catch {
    return null
  }
}

export function setJustSavedId(id: string) {
  try {
    sessionStorage.setItem(KEY, id)
  } catch {
    // sessionStorage unavailable — the "just saved" tag is cosmetic.
  }
}
