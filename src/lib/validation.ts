export function isRecord(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

export function hasOnlyKeys(value: Record<string, unknown>, keys: readonly string[]) {
  return Object.keys(value).every((key) => keys.includes(key))
}

export function hasOwnKeys(value: Record<string, unknown>, keys: readonly string[]) {
  return keys.every((key) => Object.prototype.hasOwnProperty.call(value, key))
}
