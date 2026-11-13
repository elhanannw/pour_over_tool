import { useEffect, useState } from 'react'
import { Check, Minus, Plus } from 'lucide-react'
import { fmt, stepValue } from '../lib/recipe'

export function NumberControl({
  label,
  value,
  onChange,
  step = 1,
  min = 0,
  max = 10000,
  suffix,
  disabled = false,
  large = false,
}: {
  label: string
  value: number
  onChange: (n: number) => void
  step?: number
  min?: number
  max?: number
  suffix?: string
  disabled?: boolean
  large?: boolean
}) {
  const [draft, setDraft] = useState(fmt(value, 4))
  useEffect(() => setDraft(fmt(value, 4)), [value])
  const accept = (s: string) => {
    setDraft(s)
    if (s.trim() !== '' && Number.isFinite(Number(s)) && Number(s) >= min && Number(s) <= max)
      onChange(Number(s))
  }
  return (
    <div className={`number-control ${large ? 'large' : ''} ${disabled ? 'readonly' : ''}`}>
      <button
        type="button"
        aria-label={`Decrease ${label}`}
        disabled={disabled || value <= min}
        onClick={() => onChange(Math.max(min, stepValue(value, step, -1)))}
      >
        <Minus size={15} />
      </button>
      <div className="number-value">
        <input
          aria-label={label}
          inputMode="decimal"
          type="number"
          min={min}
          max={max}
          step="any"
          disabled={disabled}
          value={draft}
          onChange={(e) => accept(e.target.value)}
          onBlur={() => setDraft(fmt(value, 4))}
        />
        <span>{suffix}</span>
      </div>
      <button
        type="button"
        aria-label={`Increase ${label}`}
        disabled={disabled || value >= max}
        onClick={() => onChange(Math.min(max, stepValue(value, step, 1)))}
      >
        <Plus size={15} />
      </button>
    </div>
  )
}
export function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
  description?: string
}) {
  return (
    <label className="toggle-row">
      <span>
        <span className="toggle-label">{label}</span>
        {description && <small>{description}</small>}
      </span>
      <input
        className="toggle-input"
        aria-label={label}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className={`switch ${checked ? 'on' : ''}`} aria-hidden="true">
        <span>{checked && <Check size={10} />}</span>
      </span>
    </label>
  )
}

export function RatioInput({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const [draft, setDraft] = useState(fmt(value, 2))
  useEffect(() => setDraft(fmt(value, 2)), [value])
  return (
    <input
      aria-label="Brew ratio"
      inputMode="decimal"
      type="number"
      min="0.1"
      max="100"
      step="any"
      value={draft}
      onChange={(e) => {
        setDraft(e.target.value)
        const n = Number(e.target.value)
        if (e.target.value.trim() && Number.isFinite(n) && n >= 0.1 && n <= 100) onChange(n)
      }}
      onBlur={() => setDraft(fmt(value, 2))}
    />
  )
}
