import { DEFAULT_RECIPE, isRecipe } from './recipe'
import type { Recipe } from './recipe'
import { hasOnlyKeys, hasOwnKeys, isRecord } from './validation'

export interface SavedRecipe {
  id: string
  recipe: Recipe
  createdAt: string
}
export interface BrewRecord {
  id: string
  recipe: Recipe
  createdAt: string
  elapsed: number
  notes: string
  rating: number | null
}
export interface Library {
  recipes: SavedRecipe[]
  brews: BrewRecord[]
}
export const LIBRARY_KEY = 'pour-lab.library.v1'
export const EDITOR_KEY = 'pour-lab.editor.v1'
export const MAX_BACKUP_BYTES = 5_000_000
export const MAX_ENTRIES = 1000
export const emptyLibrary = (): Library => ({ recipes: [], brews: [] })
const isDate = (x: unknown) => {
  if (typeof x !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(x))
    return false
  const date = new Date(x)
  return (
    Number.isFinite(date.getTime()) &&
    date.toISOString() === (x.includes('.') ? x : x.replace('Z', '.000Z'))
  )
}
const isEntry = (x: unknown): x is SavedRecipe => {
  if (!isRecord(x) || !hasOwnKeys(x, ['id', 'recipe', 'createdAt'])) return false
  const v = x
  return (
    typeof v.id === 'string' &&
    v.id.length > 0 &&
    v.id.length <= 100 &&
    isDate(v.createdAt) &&
    isRecipe(v.recipe)
  )
}
const isSavedRecipe = (x: unknown): x is SavedRecipe =>
  isRecord(x) && hasOnlyKeys(x, ['id', 'recipe', 'createdAt']) && isEntry(x)
const isBrew = (x: unknown): x is BrewRecord => {
  const keys = ['id', 'recipe', 'createdAt', 'elapsed', 'notes', 'rating']
  if (!isRecord(x) || !hasOnlyKeys(x, keys) || !hasOwnKeys(x, keys) || !isEntry(x)) return false
  const v = x
  return (
    typeof v.elapsed === 'number' &&
    Number.isFinite(v.elapsed) &&
    v.elapsed >= 0 &&
    v.elapsed <= 7 * 24 * 60 * 60 * 1000 &&
    typeof v.notes === 'string' &&
    v.notes.length <= 10000 &&
    (v.rating === null ||
      (typeof v.rating === 'number' &&
        Number.isInteger(v.rating) &&
        v.rating >= 1 &&
        v.rating <= 5))
  )
}
export function validateLibrary(value: unknown): value is Library {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, ['recipes', 'brews']) ||
    !hasOwnKeys(value, ['recipes', 'brews'])
  )
    return false
  const v = value
  return (
    Array.isArray(v.recipes) &&
    v.recipes.length <= MAX_ENTRIES &&
    v.recipes.every(isSavedRecipe) &&
    Array.isArray(v.brews) &&
    v.brews.length <= MAX_ENTRIES &&
    v.brews.every(isBrew) &&
    new Set(v.recipes.map((r) => r.id)).size === v.recipes.length &&
    new Set(v.brews.map((r) => r.id)).size === v.brews.length
  )
}
export function readLibrary(): Library {
  const raw = localStorage.getItem(LIBRARY_KEY)
  if (raw === null) return emptyLibrary()
  const value: unknown = JSON.parse(raw)
  if (!validateLibrary(value))
    throw new Error(
      'Saved library could not be read. Your original browser data has been preserved.',
    )
  return value
}
export function readEditor(): Recipe {
  const raw = localStorage.getItem(EDITOR_KEY)
  if (raw === null) return structuredClone(DEFAULT_RECIPE)
  const value: unknown = JSON.parse(raw)
  if (!isRecipe(value))
    throw new Error('The saved editor could not be read. The default recipe is shown.')
  return value
}
export const writeLibrary = (library: Library) => {
  if (!validateLibrary(library))
    throw new Error('The library is invalid or exceeds its entry limit.')
  const backup = exportBackup(library)
  if (new TextEncoder().encode(backup).byteLength > MAX_BACKUP_BYTES)
    throw new Error('The library exceeds the backup size limit.')
  localStorage.setItem(LIBRARY_KEY, JSON.stringify(library))
}
export const writeEditor = (recipe: Recipe) => {
  if (!isRecipe(recipe)) throw new Error('Invalid recipe.')
  localStorage.setItem(EDITOR_KEY, JSON.stringify(recipe))
}
export const exportBackup = (library: Library) =>
  JSON.stringify(
    { app: 'pour-lab', version: 1, exportedAt: new Date().toISOString(), ...library },
    null,
    2,
  )
export function importBackup(text: string, existing: Library): Library {
  if (
    text.length > MAX_BACKUP_BYTES ||
    new TextEncoder().encode(text).byteLength > MAX_BACKUP_BYTES
  )
    throw new Error('Backup is too large. Choose a file smaller than 5 MB.')
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error('This file is not a valid JSON backup. No data was changed.')
  }
  if (
    !isRecord(data) ||
    !hasOnlyKeys(data, ['app', 'version', 'exportedAt', 'recipes', 'brews']) ||
    !hasOwnKeys(data, ['app', 'version', 'recipes', 'brews']) ||
    data.app !== 'pour-lab' ||
    data.version !== 1 ||
    ('exportedAt' in data && !isDate(data.exportedAt)) ||
    !validateLibrary({ recipes: data.recipes, brews: data.brews })
  )
    throw new Error('Invalid Pour Lab backup. No data was changed.')
  const incoming = { recipes: data.recipes, brews: data.brews } as Library
  // Existing entries win on ID collisions; importing a backup twice is safe.
  const merge = <T extends { id: string }>(old: T[], entries: T[]) => {
    const ids = new Set(old.map((entry) => entry.id))
    return [...old, ...entries.filter((entry) => !ids.has(entry.id))]
  }
  const merged = {
    recipes: merge(existing.recipes, incoming.recipes),
    brews: merge(existing.brews, incoming.brews),
  }
  if (!validateLibrary(merged))
    throw new Error('The combined library is too large. No data was changed.')
  return merged
}
