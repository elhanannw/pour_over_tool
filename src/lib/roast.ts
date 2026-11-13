export const ROAST_PROFILES = [
  { id: 'light', label: 'Light', restDays: 14 },
  { id: 'medium-light', label: 'Medium light', restDays: 12 },
  { id: 'medium', label: 'Medium', restDays: 10 },
  { id: 'medium-dark', label: 'Medium dark', restDays: 7 },
  { id: 'dark', label: 'Dark', restDays: 5 },
] as const

export type RoastProfile = (typeof ROAST_PROFILES)[number]['id']
export type RoastState = 'resting' | 'optimal' | 'yellow' | 'red'
const DAY = 86_400_000

export function localDate(now = new Date()): string {
  return `${String(now.getFullYear()).padStart(4, '0')}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

// Calendar dates are not timestamps. UTC is used only for DST-free day arithmetic.
function parseDate(value: unknown): Date | null {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const [year, month, day] = value.split('-').map(Number)
  if (year < 1) return null
  const date = new Date(0)
  date.setUTCFullYear(year, month - 1, day)
  return date.toISOString().slice(0, 10) === value ? date : null
}

export function isRoastDate(value: unknown, today = localDate()): value is string {
  return parseDate(value) !== null && typeof value === 'string' && value <= today
}

export function isRoastProfile(value: unknown): value is RoastProfile {
  return ROAST_PROFILES.some((profile) => profile.id === value)
}

function addMonths(date: Date, months: number): string {
  const end = new Date(0)
  end.setUTCFullYear(date.getUTCFullYear(), date.getUTCMonth() + months + 1, 0)
  end.setUTCDate(Math.min(date.getUTCDate(), end.getUTCDate()))
  return end.toISOString().slice(0, 10)
}

export function roastWindow(roastDate: string, roastProfile: RoastProfile, today = localDate()) {
  const roasted = parseDate(roastDate)
  const current = parseDate(today)
  const profile = ROAST_PROFILES.find((item) => item.id === roastProfile)
  if (!roasted || !current || !profile || roastDate > today) return null
  const restUntil = new Date(roasted.getTime() + profile.restDays * DAY).toISOString().slice(0, 10)
  const yellowFrom = addMonths(roasted, 2)
  const redFrom = addMonths(roasted, 3)
  const state: RoastState =
    today >= redFrom
      ? 'red'
      : today >= yellowFrom
        ? 'yellow'
        : today >= restUntil
          ? 'optimal'
          : 'resting'
  return {
    state,
    restUntil,
    yellowFrom,
    redFrom,
    ageDays: Math.round((current.getTime() - roasted.getTime()) / DAY),
    restDays: profile.restDays,
  }
}
