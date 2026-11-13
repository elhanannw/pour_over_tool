import { useState } from 'react'
import type { Recipe } from '../lib/recipe'
import { isRoastDate, isRoastProfile, ROAST_PROFILES } from '../lib/roast'
import { useLocalDate } from '../lib/useLocalDate'
import RoastSummary from './RoastSummary'

export default function RoastFields({
  recipe,
  setRecipe,
}: {
  recipe: Recipe
  setRecipe: (recipe: Recipe) => void
}) {
  const today = useLocalDate()
  const [error, setError] = useState('')
  return (
    <section className="panel roast-section" aria-labelledby="roast-heading">
      <div className="section-heading">
        <h2 id="roast-heading">Know your beans</h2>
        <span className="section-hint">OPTIONAL</span>
      </div>
      <div className="roast-fields">
        <div>
          <label className="input-label" htmlFor="roast-date">
            Roast date
          </label>
          <input
            id="roast-date"
            className="text-input"
            type="date"
            min="0001-01-01"
            max={today}
            value={recipe.roastDate ?? ''}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? 'roast-date-error' : undefined}
            onChange={(event) => {
              const value = event.target.value
              if (value && !isRoastDate(value, today)) {
                setError('Choose a valid roast date on or before today.')
                return
              }
              setError('')
              const next = { ...recipe }
              if (value) next.roastDate = value
              else delete next.roastDate
              setRecipe(next)
            }}
          />
          {error && (
            <p className="roast-error" id="roast-date-error" role="alert">
              {error}
            </p>
          )}
        </div>
        <div>
          <label className="input-label" htmlFor="roast-profile">
            Roast profile
          </label>
          <select
            id="roast-profile"
            className="text-input"
            value={recipe.roastProfile ?? ''}
            onChange={(event) => {
              const value = event.target.value
              if (value && !isRoastProfile(value)) return
              const next = { ...recipe }
              if (isRoastProfile(value)) next.roastProfile = value
              else delete next.roastProfile
              setRecipe(next)
            }}
          >
            <option value="">Choose a profile</option>
            {ROAST_PROFILES.map((profile) => (
              <option key={profile.id} value={profile.id}>
                {profile.label} · {profile.restDays}-day rest
              </option>
            ))}
          </select>
        </div>
      </div>
      {!recipe.roastDate && !recipe.roastProfile && (
        <p className="roast-help">
          Add your roast date and profile to see when your beans are ready to brew.
        </p>
      )}
      <RoastSummary recipe={recipe} today={today} />
    </section>
  )
}
