import type { Recipe } from '../lib/recipe'
import { ROAST_PROFILES, roastWindow } from '../lib/roast'

const formatDate = (date: string) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  })

export default function RoastSummary({ recipe, today }: { recipe: Recipe; today: string }) {
  if (!recipe.roastDate && !recipe.roastProfile) return null
  const profile = ROAST_PROFILES.find((item) => item.id === recipe.roastProfile)
  const window =
    recipe.roastDate && recipe.roastProfile
      ? roastWindow(recipe.roastDate, recipe.roastProfile, today)
      : null
  const label =
    window?.state === 'resting'
      ? 'Resting'
      : window?.state === 'optimal'
        ? 'Optimal brew window'
        : window?.state === 'yellow'
          ? 'Two months since roast'
          : 'Three months or more since roast'
  return (
    <div className="roast-summary">
      <p className="roast-metadata">
        {profile && <span>{profile.label} roast</span>}
        {recipe.roastDate && (
          <span>
            Roasted <time dateTime={recipe.roastDate}>{formatDate(recipe.roastDate)}</time>
          </span>
        )}
      </p>
      {window ? (
        <div className={`roast-status roast-status--${window.state}`}>
          <strong>
            <span className="roast-status-dot" aria-hidden="true" />
            {label}
          </strong>
          <span>
            {window.ageDays} {window.ageDays === 1 ? 'day' : 'days'} since roast
          </span>
          <p>
            {window.state === 'resting'
              ? `Ready from ${formatDate(window.restUntil)} · ${window.restDays}-day rest.`
              : window.state === 'optimal'
                ? `Recommended rest complete · turns yellow on ${formatDate(window.yellowFrom)}.`
                : window.state === 'yellow'
                  ? `Turns red on ${formatDate(window.redFrom)}.`
                  : 'Past the three-month freshness marker.'}
          </p>
        </div>
      ) : (
        <p className="roast-help">
          {!recipe.roastDate
            ? 'Add a roast date to see the brew window.'
            : !profile
              ? 'Choose a roast profile to see the brew window.'
              : 'The roast date is ahead of your current local date.'}
        </p>
      )}
    </div>
  )
}
