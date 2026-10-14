import { type Dispatch, type SetStateAction, useState } from 'react'
import { type GalleryHaiku, upvoteHaiku } from './gallery'

const VOTED_KEY = 'votedHaikuIds'

function loadVotedIds(): Set<string> {
  try {
    const raw = localStorage.getItem(VOTED_KEY)
    return new Set(raw ? (JSON.parse(raw) as string[]) : [])
  } catch {
    return new Set()
  }
}

function saveVotedIds(ids: Set<string>) {
  try {
    localStorage.setItem(VOTED_KEY, JSON.stringify([...ids]))
  } catch {
    // localStorage unavailable (private mode, quota, etc.) — voting still
    // works for this page view, it just won't be remembered next time.
  }
}

/** Optimistic upvoting over a list of gallery items, remembering votes in localStorage. */
export function useVoting(
  setItems: Dispatch<SetStateAction<GalleryHaiku[]>>,
  onError: (message: string) => void,
) {
  const [votedIds, setVotedIds] = useState<Set<string>>(() => loadVotedIds())

  const bump = (id: string, by: number) =>
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, upvotes: item.upvotes + by } : item)))
  const setVoted = (id: string, voted: boolean) =>
    setVotedIds((prev) => {
      const next = new Set(prev)
      if (voted) next.add(id)
      else next.delete(id)
      saveVotedIds(next)
      return next
    })

  const upvote = async (id: string) => {
    bump(id, 1)
    setVoted(id, true)
    try {
      await upvoteHaiku(id)
    } catch {
      bump(id, -1)
      setVoted(id, false)
      onError('Upvote failed — try again.')
    }
  }

  return { votedIds, upvote }
}
