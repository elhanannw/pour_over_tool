import Decimal from 'decimal.js'
import { hasOnlyKeys, hasOwnKeys, isRecord } from './validation'
import { isRoastDate, isRoastProfile } from './roast'
import type { RoastProfile } from './roast'

Decimal.set({ precision: 30 })
export interface Recipe {
  name: string
  coffee: number
  water: number
  locked: boolean
  autoBalance: boolean
  units: number[]
  roastDate?: string
  roastProfile?: RoastProfile
  roasterNotes?: string
}
export const DEFAULT_RECIPE: Recipe = {
  name: 'Everyday balance',
  coffee: 15,
  water: 255,
  locked: true,
  autoBalance: true,
  units: [5, 8, 4],
}
export const POUR_LABELS: Record<number, string[]> = {
  2: ['Acid + Sweetness', 'Body + Finish'],
  3: ['Acid', 'Sweetness', 'Body + Finish'],
  4: ['Acid', 'Sweetness', 'Body', 'Finish'],
  5: ['Acid', 'Sweetness', 'Body', 'Structure', 'Finish'],
}
export const POUR_COLORS = ['#c88c63', '#d4b56f', '#8d9c82', '#a4a2ba', '#ad8c80']
export const fmt = (n: number, places = 1) => new Decimal(n).toDecimalPlaces(places).toString()
export const totalUnits = (r: Recipe) => new Decimal(r.water).div(r.coffee).toNumber()
export const sum = (units: number[]) => units.reduce((a, u) => a.plus(u), new Decimal(0)).toNumber()
export const remaining = (r: Recipe) =>
  new Decimal(r.water).div(r.coffee).minus(sum(r.units)).toNumber()
export const isBalanced = (r: Recipe) => Math.abs(remaining(r) * r.coffee) < 0.000001
export const validPositive = (n: number) => Number.isFinite(n) && n >= 0.1 && n <= 10000
const precise = (n: Decimal) => n.toDecimalPlaces(12).toNumber()
export const stepValue = (value: number, step: number, direction: number) =>
  precise(new Decimal(value).plus(new Decimal(step).times(direction)))

// Keep earlier pours when feasible. Overflow is safely scaled to the new capacity.
export function balance(r: Recipe): Recipe {
  const total = new Decimal(r.water).div(r.coffee)
  const earlier = r.units.slice(0, -1)
  const allocated = new Decimal(sum(earlier))
  const safe = allocated.gt(total)
    ? earlier.map((u) => precise(new Decimal(u).times(total).div(allocated)))
    : earlier
  // Correct tiny rounding excess before computing a nonnegative final remainder.
  const excess = new Decimal(sum(safe)).minus(total)
  if (excess.gt(0) && safe.length)
    safe[safe.length - 1] = Math.max(0, safe[safe.length - 1] - excess.toNumber())
  return { ...r, units: [...safe, Math.max(0, total.minus(sum(safe)).toNumber())] }
}
export function updateUnit(r: Recipe, index: number, value: number): Recipe {
  if (
    !Number.isFinite(value) ||
    value < 0 ||
    value > 100000 ||
    index < 0 ||
    index >= r.units.length
  )
    return r
  if (r.autoBalance && index === r.units.length - 1) return r
  const units = [...r.units]
  if (r.autoBalance) {
    const other = units
      .slice(0, -1)
      .reduce((a, u, i) => (i === index ? a : a.plus(u)), new Decimal(0))
    value = Math.min(value, Math.max(0, new Decimal(r.water).div(r.coffee).minus(other).toNumber()))
  }
  units[index] = value
  return r.autoBalance ? balance({ ...r, units }) : { ...r, units }
}
export function updateCoffee(r: Recipe, coffee: number): Recipe {
  if (!validPositive(coffee) || coffee > 500) return r
  const water = r.locked ? precise(new Decimal(r.water).div(r.coffee).times(coffee)) : r.water
  if (!validPositive(water)) return r
  const next = { ...r, coffee, water }
  return r.autoBalance ? balance(next) : next
}
export function updateWater(r: Recipe, water: number): Recipe {
  if (!validPositive(water)) return r
  const next = { ...r, water }
  return r.autoBalance ? balance(next) : next
}
export function updateRatio(r: Recipe, ratio: number): Recipe {
  if (!validPositive(ratio) || ratio > 100) return r
  return updateWater(r, precise(new Decimal(r.coffee).times(ratio)))
}
export function updateCount(r: Recipe, count: number): Recipe {
  if (![2, 3, 4, 5].includes(count)) return r
  const unit = precise(new Decimal(r.water).div(r.coffee).div(count))
  return balance({ ...r, units: Array(count).fill(unit) })
}
export function pours(r: Recipe) {
  let cumulative = new Decimal(0)
  return r.units.map((units, i) => {
    const water = new Decimal(units).times(r.coffee)
    cumulative = cumulative.plus(water)
    return {
      label: POUR_LABELS[r.units.length][i],
      units,
      water: water.toNumber(),
      target: i === r.units.length - 1 && isBalanced(r) ? r.water : cumulative.toNumber(),
    }
  })
}
export function isRecipe(value: unknown): value is Recipe {
  const keys = ['name', 'coffee', 'water', 'locked', 'autoBalance', 'units']
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, [...keys, 'roastDate', 'roastProfile', 'roasterNotes']) ||
    !hasOwnKeys(value, keys)
  )
    return false
  const r = value
  return (
    (!Object.prototype.hasOwnProperty.call(r, 'roastDate') || isRoastDate(r.roastDate)) &&
    (!Object.prototype.hasOwnProperty.call(r, 'roastProfile') || isRoastProfile(r.roastProfile)) &&
    (!Object.prototype.hasOwnProperty.call(r, 'roasterNotes') ||
      (typeof r.roasterNotes === 'string' && r.roasterNotes.length <= 500)) &&
    typeof r.name === 'string' &&
    r.name.trim().length > 0 &&
    r.name.length <= 100 &&
    typeof r.coffee === 'number' &&
    validPositive(r.coffee) &&
    r.coffee <= 500 &&
    typeof r.water === 'number' &&
    validPositive(r.water) &&
    typeof r.locked === 'boolean' &&
    typeof r.autoBalance === 'boolean' &&
    Array.isArray(r.units) &&
    [2, 3, 4, 5].includes(r.units.length) &&
    r.units.every((u) => typeof u === 'number' && Number.isFinite(u) && u >= 0 && u <= 100000) &&
    (!r.autoBalance ||
      isBalanced({
        name: r.name,
        coffee: r.coffee,
        water: r.water,
        locked: r.locked,
        autoBalance: r.autoBalance,
        units: r.units,
      }))
  )
}
