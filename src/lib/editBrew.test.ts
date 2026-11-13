import { describe, expect, it } from 'vitest'
import { editBrew } from './editBrew'
import { DEFAULT_RECIPE } from './recipe'
import { emptyLibrary, exportBackup, importBackup, readLibrary, writeLibrary } from './storage'

const recipe = { ...DEFAULT_RECIPE, roastDate: '2020-01-01', roastProfile: 'light' as const }
const brew = {
  id: 'brew-1',
  recipe,
  createdAt: '2026-11-13T04:00:00Z',
  elapsed: 120000,
  notes: 'Original',
  rating: 3,
}
const library = {
  recipes: [{ id: 'recipe-1', recipe, createdAt: brew.createdAt }],
  brews: [brew, { ...brew, id: 'brew-2' }],
}
const edits = { name: ' New cup ', notes: ' Sweeter after cooling ', rating: 5 }

describe('editing a recorded brew', () => {
  it('changes only the selected brew name, notes and rating and retains recorded settings', () => {
    const updated = editBrew(library, 'brew-1', edits)
    expect(updated.brews[0]).toEqual({
      ...brew,
      recipe: { ...recipe, name: 'New cup' },
      notes: 'Sweeter after cooling',
      rating: 5,
    })
    expect(updated.brews[1]).toBe(library.brews[1])
    expect(updated.recipes).toBe(library.recipes)
    expect(brew.recipe.name).toBe(DEFAULT_RECIPE.name)
    expect(brew.notes).toBe('Original')
    writeLibrary(updated)
    expect(readLibrary()).toEqual(updated)
    expect(importBackup(exportBackup(updated), emptyLibrary())).toEqual(updated)
  })
  it('allows clearing notes and resetting a rating to Unrated', () => {
    expect(
      editBrew(library, 'brew-1', { ...edits, notes: '', rating: null }).brews[0],
    ).toMatchObject({ notes: '', rating: null })
  })
  it.each([
    null,
    {},
    { ...edits, name: '  ' },
    { ...edits, name: 'a'.repeat(101) },
    { ...edits, notes: 'a'.repeat(10001) },
    { ...edits, rating: 0 },
    { ...edits, rating: 6 },
    { ...edits, rating: 1.5 },
    { ...edits, rating: '5' },
    { ...edits, elapsed: 0 },
    { ...edits, notes: {} },
  ])('rejects invalid or extra fields atomically: %j', (patch) => {
    const before = JSON.stringify(library)
    expect(() => editBrew(library, 'brew-1', patch)).toThrow()
    expect(JSON.stringify(library)).toBe(before)
  })
  it('does not recreate deleted brews', () => {
    expect(() => editBrew(library, 'deleted', edits)).toThrow('no longer exists')
  })
})
