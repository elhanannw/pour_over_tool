import { fmt, POUR_COLORS, pours, sum } from '../lib/recipe'
import type { Recipe } from '../lib/recipe'

export default function PourBar({ recipe, legend = true }: { recipe: Recipe; legend?: boolean }) {
  const denominator = Math.max(sum(recipe.units), recipe.water / recipe.coffee)
  return (
    <div className="pour-visual">
      <div
        className="pour-bar"
        role="img"
        aria-label={`Pour distribution: ${pours(recipe)
          .map((p) => `${p.label} ${fmt(p.water)} grams`)
          .join(', ')}`}
      >
        {recipe.units.map((u, i) => (
          <span
            key={i}
            style={{ width: `${(100 * u) / denominator}%`, backgroundColor: POUR_COLORS[i] }}
          />
        ))}
      </div>
      {legend && (
        <div className="bar-legend">
          {pours(recipe).map((p, i) => (
            <span key={i}>
              <i style={{ background: POUR_COLORS[i] }} />
              {p.label}
              <b>{fmt(p.water)}g</b>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
