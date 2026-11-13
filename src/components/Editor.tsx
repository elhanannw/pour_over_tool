import {
  ArrowRight,
  Bookmark,
  Check,
  ChevronDown,
  Droplets,
  Info,
  LockKeyhole,
  RotateCcw,
  Scale,
  UnlockKeyhole,
} from 'lucide-react'
import { useState } from 'react'
import {
  balance,
  DEFAULT_RECIPE,
  fmt,
  isBalanced,
  POUR_COLORS,
  pours,
  remaining,
  totalUnits,
  updateCoffee,
  updateCount,
  updateRatio,
  updateUnit,
  updateWater,
} from '../lib/recipe'
import type { Recipe } from '../lib/recipe'
import { NumberControl, RatioInput, Toggle } from './Controls'
import PourBar from './PourBar'
import Dripper from './Dripper'
import RoastFields from './RoastFields'

export default function Editor({
  recipe,
  setRecipe,
  onSave,
  onBrew,
  notify,
}: {
  recipe: Recipe
  setRecipe: (r: Recipe) => void
  onSave: () => void
  onBrew: () => void
  notify: (s: string) => void
}) {
  const [gramStep, setGramStep] = useState(1)
  const [unitStep, setUnitStep] = useState(1)
  const balanced = isBalanced(recipe)
  const changeWater = (water: number) => {
    const exceeds = recipe.units.slice(0, -1).reduce((a, b) => a + b, 0) > water / recipe.coffee
    setRecipe(updateWater(recipe, water))
    if (exceeds && recipe.autoBalance)
      notify('Earlier pours were proportionally reduced to fit the new water target.')
  }
  return (
    <>
      <section className="page-heading">
        <div>
          <div className="eyebrow">
            <span /> YOUR DAILY RITUAL, REFINED
          </div>
          <h1>
            A better cup, <em>by design.</em>
          </h1>
          <p>A little precision. A little curiosity. Make every pour your own.</p>
        </div>
        <div className="heading-note">
          <span className="tiny-cross">✳</span>
          <span>
            Good coffee starts
            <br />
            with a good plan.
          </span>
        </div>
      </section>
      <div className="editor-layout">
        <div className="editor-main">
          <section className="panel recipe-basics">
            <div className="section-heading">
              <div className="section-title">
                <span className="step-label">01</span>
                <h2>Set your foundation</h2>
              </div>
              <label className="inline-select">
                Adjust by{' '}
                <select
                  aria-label="Gram increment"
                  value={gramStep}
                  onChange={(e) => setGramStep(Number(e.target.value))}
                >
                  <option value={1}>1g</option>
                  <option value={5}>5g</option>
                  <option value={0.5}>0.5g</option>
                </select>
                <ChevronDown size={12} />
              </label>
            </div>
            <div className="foundation-grid">
              <div className="foundation-field">
                <label>
                  <span className="field-icon">◒</span> COFFEE DOSE
                </label>
                <NumberControl
                  label="Coffee dose"
                  value={recipe.coffee}
                  min={0.1}
                  max={500}
                  step={gramStep}
                  onChange={(n) => setRecipe(updateCoffee(recipe, n))}
                  suffix="g"
                  large
                />
              </div>
              <div className="foundation-field">
                <label>
                  <Droplets size={14} /> TOTAL WATER
                </label>
                <NumberControl
                  label="Total water"
                  value={recipe.water}
                  min={0.1}
                  step={gramStep}
                  onChange={changeWater}
                  suffix="g"
                  large
                />
              </div>
              <div className="foundation-field ratio-field">
                <label>
                  <Scale size={14} /> BREW RATIO
                </label>
                <div className="ratio-value">
                  <span>1 :</span>
                  <RatioInput
                    value={totalUnits(recipe)}
                    onChange={(n) => setRecipe(updateRatio(recipe, n))}
                  />
                </div>
              </div>
            </div>
            <div className="foundation-bottom">
              <button
                className={`lock-button ${recipe.locked ? 'active' : ''}`}
                aria-pressed={recipe.locked}
                onClick={() => setRecipe({ ...recipe, locked: !recipe.locked })}
              >
                {recipe.locked ? <LockKeyhole size={13} /> : <UnlockKeyhole size={13} />}
                {recipe.locked ? 'Ratio locked' : 'Ratio unlocked'}
              </button>
              <span>
                {recipe.locked
                  ? 'Dose changes keep your ratio in harmony.'
                  : 'Dose changes keep your water target fixed.'}
              </span>
            </div>
          </section>
          <RoastFields recipe={recipe} setRecipe={setRecipe} />
          <section className="panel pour-section">
            <div className="section-heading">
              <div className="section-title">
                <span className="step-label">02</span>
                <h2>Find your flow</h2>
              </div>
              <span className="section-hint">ONE UNIT = {fmt(recipe.coffee)}G WATER</span>
            </div>
            <div className="pour-toolbar">
              <div className="count-control">
                <span>Number of pours</span>
                <div className="segmented" role="group" aria-label="Pour count">
                  {[2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      aria-pressed={recipe.units.length === n}
                      className={recipe.units.length === n ? 'selected' : ''}
                      onClick={() => setRecipe(updateCount(recipe, n))}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
              <label className="inline-select">
                Unit step{' '}
                <select
                  aria-label="Unit increment"
                  value={unitStep}
                  onChange={(e) => setUnitStep(Number(e.target.value))}
                >
                  {[1, 0.5, 0.1].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
                <ChevronDown size={12} />
              </label>
            </div>
            <div className="pour-list">
              {pours(recipe).map((p, i) => (
                <article
                  className="pour-card"
                  key={`${recipe.units.length}-${i}`}
                  style={{ '--pour-color': POUR_COLORS[i] } as React.CSSProperties}
                >
                  <div className="pour-card-label">
                    <span className="pour-number">{String(i + 1).padStart(2, '0')}</span>
                    <div>
                      <h3>{p.label}</h3>
                      <span>
                        {recipe.autoBalance && i === recipe.units.length - 1
                          ? 'Auto-balanced finish'
                          : `Pour ${i + 1}`}
                      </span>
                    </div>
                  </div>
                  <div className="pour-units">
                    <NumberControl
                      label={`Pour ${i + 1} units`}
                      value={p.units}
                      step={unitStep}
                      max={100000}
                      onChange={(n) => setRecipe(updateUnit(recipe, i, n))}
                      disabled={recipe.autoBalance && i === recipe.units.length - 1}
                    />
                    <small>units</small>
                  </div>
                  <div className="pour-weight">
                    <strong>
                      {fmt(p.water)}
                      <small>g</small>
                    </strong>
                    <span>pour water</span>
                  </div>
                  <div className="pour-target">
                    <strong>
                      {fmt(p.target)}
                      <small>g</small>
                    </strong>
                    <span>
                      scale target <ArrowRight size={11} />
                    </span>
                  </div>
                </article>
              ))}
            </div>
            <div className="balance-setting">
              <Toggle
                checked={recipe.autoBalance}
                onChange={(v) =>
                  setRecipe(
                    v
                      ? balance({ ...recipe, autoBalance: true })
                      : { ...recipe, autoBalance: false },
                  )
                }
                label="Auto-balance last pour"
                description="The final pour takes care of the rest."
              />
              <span
                className="info-circle"
                title="Earlier pours keep their units; the last pour receives the remaining water."
              >
                <Info size={16} />
              </span>
            </div>
            {!balanced && (
              <div className="balance-warning" role="status">
                <span>
                  {fmt(Math.abs(remaining(recipe)), 4)} units{' '}
                  {remaining(recipe) > 0 ? 'unallocated' : 'over target'} ·{' '}
                  {fmt(Math.abs(remaining(recipe) * recipe.coffee))}g
                </span>
                <button
                  onClick={() => {
                    setRecipe(balance(recipe))
                    notify(
                      'Recipe balanced. Earlier pours were adjusted only if they exceeded the target.',
                    )
                  }}
                >
                  Balance recipe <ArrowRight size={14} />
                </button>
              </div>
            )}
            <p className="calibration-note">
              <Info size={13} /> These labels are a personal calibration framework. Every pour
              contributes to the whole cup.
            </p>
          </section>
          <div className="editor-footer">
            <span>Small adjustments. Delicious discoveries.</span>
            <button
              className="text-button"
              onClick={() => {
                setRecipe(structuredClone(DEFAULT_RECIPE))
                notify('Editor reset to the everyday recipe.')
              }}
            >
              <RotateCcw size={14} /> Reset recipe
            </button>
          </div>
        </div>
        <aside className="recipe-sidebar">
          <section className="brew-overview">
            <div className="overview-top">
              <span className="eyebrow">THE CUP YOU'RE CREATING</span>
              <span className="edition">N° 01</span>
            </div>
            <Dripper />
            <h2>Made to your measure.</h2>
            <p>Your recipe, one thoughtful pour at a time.</p>
            <div className="overview-stats">
              <div>
                <strong>
                  {fmt(recipe.coffee)}
                  <small>g</small>
                </strong>
                <span>COFFEE</span>
              </div>
              <span className="stat-divider" />
              <div>
                <strong>
                  {fmt(recipe.water)}
                  <small>g</small>
                </strong>
                <span>WATER</span>
              </div>
              <span className="stat-divider" />
              <div>
                <strong>1:{fmt(totalUnits(recipe), 2)}</strong>
                <span>RATIO</span>
              </div>
            </div>
          </section>
          <section className="panel recipe-summary">
            <div className="section-heading">
              <h2>Your pour plan</h2>
              <span className={`balance-badge ${balanced ? '' : 'unbalanced'}`}>
                {balanced ? <Check size={11} /> : <Info size={11} />}
                {balanced ? 'Balanced' : 'Adjust pours'}
              </span>
            </div>
            <PourBar recipe={recipe} />
            <div className="summary-total">
              <span>
                Total units <strong>{fmt(totalUnits(recipe), 4)}</strong>
              </span>
              <span>
                Pours <strong>{recipe.units.length}</strong>
              </span>
            </div>
            <button className="primary-button start-brew" disabled={!balanced} onClick={onBrew}>
              <Droplets size={18} /> Start brewing <ArrowRight size={18} />
            </button>
            <button className="secondary-button" onClick={onSave}>
              <Bookmark size={16} /> Save recipe
            </button>
            <p className="summary-footnote">A good cup is worth a little attention.</p>
          </section>
          <div className="lab-note">
            <span>FROM THE LAB</span>
            <p>
              “Change one thing.
              <br />
              Taste the difference.
              <br />
              <em>Find your cup.</em>”
            </p>
            <i />
          </div>
        </aside>
      </div>
    </>
  )
}
