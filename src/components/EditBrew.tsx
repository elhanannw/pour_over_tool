import { useId, useState } from 'react'
import type { BrewEdits } from '../lib/editBrew'

export default function EditBrew({
  draft,
  onChange,
  onSave,
  onCancel,
}: {
  draft: BrewEdits
  onChange: (draft: BrewEdits) => void
  onSave: (edits: BrewEdits) => boolean
  onCancel: () => void
}) {
  const id = useId()
  const { name, notes, rating } = draft
  const [failed, setFailed] = useState(false)
  return (
    <form
      className="brew-edit"
      aria-label="Edit recorded brew"
      onSubmit={(event) => {
        event.preventDefault()
        if (!name.trim()) return
        setFailed(!onSave({ name, notes, rating }))
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault()
          onCancel()
        }
      }}
    >
      <label className="input-label" htmlFor={`${id}-name`}>
        Brew name
      </label>
      <input
        id={`${id}-name`}
        className="text-input"
        value={name}
        required
        maxLength={100}
        autoFocus
        onChange={(event) => onChange({ ...draft, name: event.target.value })}
      />
      <label className="input-label" htmlFor={`${id}-notes`}>
        Tasting notes
      </label>
      <textarea
        id={`${id}-notes`}
        rows={4}
        maxLength={10000}
        value={notes}
        onChange={(event) => onChange({ ...draft, notes: event.target.value })}
      />
      <label className="input-label" htmlFor={`${id}-rating`}>
        Coffee rating
      </label>
      <select
        id={`${id}-rating`}
        className="text-input"
        value={rating ?? ''}
        onChange={(event) =>
          onChange({ ...draft, rating: event.target.value ? Number(event.target.value) : null })
        }
      >
        <option value="">Unrated</option>
        {[1, 2, 3, 4, 5].map((value) => (
          <option key={value} value={value}>
            {value} {value === 1 ? 'star' : 'stars'}
          </option>
        ))}
      </select>
      {failed && (
        <p className="roast-error" role="alert">
          Your changes could not be saved. Your draft is still here; try again or cancel.
        </p>
      )}
      <div className="brew-edit-actions">
        <button type="submit" className="primary-button" disabled={!name.trim()}>
          Save changes
        </button>
        <button type="button" className="secondary-button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  )
}
