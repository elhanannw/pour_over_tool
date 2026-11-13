import { describe, expect, it } from 'vitest'
import { DEFAULT_RECIPE, isRecipe } from './recipe'
import { editBrew } from './editBrew'
import {
  emptyLibrary,
  exportBackup,
  importBackup,
  readEditor,
  readLibrary,
  writeEditor,
  writeLibrary,
} from './storage'

describe('optional roaster flavour notes', () => {
  it('retains suggested flavours separately from personal notes through storage and backups', () => {
    const recipe = { ...DEFAULT_RECIPE, roasterNotes: 'Peach, honey and cocoa' }
    const saved = { id: 'recipe', recipe, createdAt: '2026-11-13T04:00:00Z' }
    const library = {
      recipes: [saved],
      brews: [{ ...saved, id: 'brew', elapsed: 120000, notes: 'My cup was floral', rating: 4 }],
    }
    writeEditor(recipe)
    writeLibrary(library)
    expect(readEditor()).toEqual(recipe)
    expect(readLibrary()).toEqual(library)
    expect(importBackup(exportBackup(library), emptyLibrary())).toEqual(library)
    const edited = editBrew(library, 'brew', {
      name: 'Renamed',
      notes: 'My revised notes',
      rating: 5,
    })
    expect(edited.brews[0].recipe.roasterNotes).toBe(recipe.roasterNotes)
    expect(edited.brews[0].notes).toBe('My revised notes')
  })
  it('accepts legacy recipes, empty notes and the 500-character boundary', () => {
    expect(isRecipe(DEFAULT_RECIPE)).toBe(true)
    expect(isRecipe({ ...DEFAULT_RECIPE, roasterNotes: '' })).toBe(true)
    expect(isRecipe({ ...DEFAULT_RECIPE, roasterNotes: 'a'.repeat(500) })).toBe(true)
  })
  it.each([null, 42, {}, ['Peach'], 'a'.repeat(501)])(
    'rejects invalid roaster notes atomically: %j',
    (roasterNotes) => {
      const recipe = { ...DEFAULT_RECIPE, roasterNotes }
      expect(isRecipe(recipe)).toBe(false)
      const existing = emptyLibrary()
      const data = {
        app: 'pour-lab',
        version: 1,
        recipes: [{ id: 'recipe', recipe, createdAt: '2026-11-13T04:00:00Z' }],
        brews: [],
      }
      expect(() => importBackup(JSON.stringify(data), existing)).toThrow('Invalid Pour Lab backup')
      expect(existing).toEqual(emptyLibrary())
    },
  )
})
