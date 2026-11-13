import type { Library } from './storage'
import { hasOnlyKeys, hasOwnKeys, isRecord } from './validation'

export interface BrewEdits {
  name: string
  notes: string
  rating: number | null
}

export function editBrew(library: Library, id: string, edits: unknown): Library {
  const keys = ['name', 'notes', 'rating']
  if (
    !isRecord(edits) ||
    !hasOnlyKeys(edits, keys) ||
    !hasOwnKeys(edits, keys) ||
    typeof edits.name !== 'string' ||
    !edits.name.trim() ||
    edits.name.length > 100 ||
    typeof edits.notes !== 'string' ||
    edits.notes.length > 10000 ||
    !(
      edits.rating === null ||
      (typeof edits.rating === 'number' &&
        Number.isInteger(edits.rating) &&
        edits.rating >= 1 &&
        edits.rating <= 5)
    )
  ) {
    throw new Error(
      'Enter a brew name (up to 100 characters), notes (up to 10,000 characters) and a rating from 1 to 5 or Unrated.',
    )
  }
  if (!library.brews.some((brew) => brew.id === id))
    throw new Error('This brew no longer exists. Your changes were not saved.')
  const { name, notes, rating } = edits as unknown as BrewEdits
  return {
    ...library,
    brews: library.brews.map((brew) =>
      brew.id === id
        ? {
            ...brew,
            recipe: { ...brew.recipe, name: name.trim() },
            notes: notes.trim(),
            rating,
          }
        : brew,
    ),
  }
}
