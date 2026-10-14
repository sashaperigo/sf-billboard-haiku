import { useEffect, useState } from 'react'
import { MAX_CREATOR_LENGTH } from '../lib/creator'

export interface SaveDialogProps {
  onSave: (creator: string) => void
  onClose: () => void
}

const STORAGE_KEY = 'haikuNickname'

export function SaveDialog({ onSave, onClose }: SaveDialogProps) {
  const [name, setName] = useState(() => localStorage.getItem(STORAGE_KEY) ?? '')
  const trimmed = name.trim()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!trimmed) return
    localStorage.setItem(STORAGE_KEY, trimmed)
    onSave(trimmed)
  }

  return (
    <div className="share-scrim" onClick={onClose}>
      <form
        className="save-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="save-title"
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
      >
        <h2 id="save-title">Who generated this haiku?</h2>
        <p>Enter a nickname. (Don't use your real name!)</p>
        <label htmlFor="nickname">Nickname</label>
        <input
          id="nickname"
          type="text"
          autoFocus
          autoComplete="off"
          maxLength={MAX_CREATOR_LENGTH}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <div className="save-dialog-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-amber" disabled={!trimmed}>
            Save
          </button>
        </div>
      </form>
    </div>
  )
}
