import {
  ArrowDownToLine,
  ArrowRight,
  Bookmark,
  Clock3,
  Copy,
  FileUp,
  Plus,
  Star,
  Trash2,
} from 'lucide-react'
import { useRef, useState } from 'react'
import type { BrewEdits } from '../lib/editBrew'
import EditBrew from './EditBrew'
import type { Library as LibraryData } from '../lib/storage'
import { exportBackup } from '../lib/storage'
import { fmt, totalUnits } from '../lib/recipe'
import type { Recipe } from '../lib/recipe'
import { formatTime } from '../lib/timer'
import PourBar from './PourBar'
import RoastSummary from './RoastSummary'
import { useLocalDate } from '../lib/useLocalDate'

export default function Library({
  library,
  tab,
  setTab,
  onLoad,
  onDuplicate,
  onDelete,
  onImport,
  onNew,
  onEditBrew,
}: {
  library: LibraryData
  tab: 'recipes' | 'history'
  setTab: (tab: 'recipes' | 'history') => void
  onLoad: (r: Recipe) => void
  onDuplicate: (id: string) => void
  onDelete: (id: string, kind: 'recipes' | 'brews') => void
  onImport: (file: File) => void
  onNew: () => void
  onEditBrew: (id: string, edits: BrewEdits) => boolean
}) {
  const input = useRef<HTMLInputElement>(null)
  const today = useLocalDate()
  const [editingId, setEditingId] = useState<string | null>(null)
  const exportData = () => {
    const url = URL.createObjectURL(new Blob([exportBackup(library)], { type: 'application/json' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `pour-lab-backup-${new Date().toISOString().slice(0, 10)}.json`
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  return (
    <>
      <section className="page-heading">
        <div>
          <div className="eyebrow">
            <span /> YOUR PERSONAL COFFEE JOURNAL
          </div>
          <h1>
            A collection of <em>good cups.</em>
          </h1>
          <p>Keep the recipes you love. Learn from every brew.</p>
        </div>
        <button className="secondary-button new-recipe-button" onClick={onNew}>
          <Plus size={16} />
          New recipe
        </button>
      </section>
      <div className="library-toolbar">
        <div className="library-tabs" role="tablist" aria-label="Library views">
          <button
            role="tab"
            aria-selected={tab === 'recipes'}
            className={tab === 'recipes' ? 'active' : ''}
            onClick={() => setTab('recipes')}
          >
            <Bookmark size={16} />
            Saved recipes <span>{library.recipes.length}</span>
          </button>
          <button
            role="tab"
            aria-selected={tab === 'history'}
            className={tab === 'history' ? 'active' : ''}
            onClick={() => setTab('history')}
          >
            <Clock3 size={16} />
            Brew history <span>{library.brews.length}</span>
          </button>
        </div>
        <div className="backup-actions">
          <button className="text-button" onClick={exportData}>
            <ArrowDownToLine size={15} />
            Export backup
          </button>
          <button className="text-button" onClick={() => input.current?.click()}>
            <FileUp size={15} />
            Import
          </button>
          <input
            className="sr-only"
            type="file"
            accept="application/json,.json"
            aria-label="Import backup file"
            ref={input}
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) onImport(file)
              e.target.value = ''
            }}
          />
        </div>
      </div>
      {tab === 'recipes' ? (
        <div className="library-grid">
          {library.recipes.length === 0 && (
            <div className="empty-state panel">
              <Bookmark size={32} />
              <h2>Your next favorite starts here.</h2>
              <p>Save a recipe from the editor to give it a place in your collection.</p>
              <button className="primary-button" onClick={onNew}>
                Create your first recipe
                <ArrowRight size={17} />
              </button>
            </div>
          )}
          {[...library.recipes].reverse().map((entry) => (
            <article className="panel library-card" key={entry.id}>
              <div className="library-card-top">
                <span className="eyebrow">{entry.recipe.units.length} POUR RECIPE</span>
                <div>
                  <button
                    className="icon-button"
                    aria-label={`Duplicate ${entry.recipe.name}`}
                    onClick={() => onDuplicate(entry.id)}
                  >
                    <Copy size={16} />
                  </button>
                  <button
                    className="icon-button"
                    aria-label={`Delete ${entry.recipe.name}`}
                    onClick={() => onDelete(entry.id, 'recipes')}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <h2>{entry.recipe.name}</h2>
              <p className="recipe-meta">
                {fmt(entry.recipe.coffee)}g coffee <span>·</span> {fmt(entry.recipe.water)}g water{' '}
                <span>·</span> 1:{fmt(totalUnits(entry.recipe), 2)}
              </p>
              <RoastSummary recipe={entry.recipe} today={today} />
              <PourBar recipe={entry.recipe} legend={false} />
              <div className="library-card-bottom">
                <small>
                  {new Date(entry.createdAt).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </small>
                <button className="text-button" onClick={() => onLoad(entry.recipe)}>
                  Load recipe
                  <ArrowRight size={15} />
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="history-list">
          {library.brews.length === 0 && (
            <div className="empty-state panel">
              <Clock3 size={32} />
              <h2>Every cup has a story.</h2>
              <p>Finish a brew and save your tasting notes to start your journal.</p>
              <button className="primary-button" onClick={onNew}>
                Plan a brew
                <ArrowRight size={17} />
              </button>
            </div>
          )}
          {[...library.brews].reverse().map((entry) => (
            <article className="panel history-card" key={entry.id}>
              <div className="history-card-heading">
                <div>
                  <span className="eyebrow">
                    {new Date(entry.createdAt).toLocaleString(undefined, {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </span>
                  <h2>{entry.recipe.name}</h2>
                </div>
                <span className="history-time">
                  <Clock3 size={15} />
                  {formatTime(entry.elapsed)}
                </span>
                <button
                  className="icon-button"
                  aria-label={`Delete brew ${entry.recipe.name}`}
                  onClick={() => onDelete(entry.id, 'brews')}
                >
                  <Trash2 size={16} />
                </button>
              </div>
              <p className="recipe-meta">
                {fmt(entry.recipe.coffee)}g coffee · {fmt(entry.recipe.water)}g water · 1:
                {fmt(totalUnits(entry.recipe), 2)} · {entry.recipe.units.length} pours
              </p>
              <RoastSummary recipe={entry.recipe} today={today} />
              <PourBar recipe={entry.recipe} />
              {editingId === entry.id ? (
                <EditBrew
                  key={entry.id}
                  brew={entry}
                  onCancel={() => setEditingId(null)}
                  onSave={(edits) => {
                    const saved = onEditBrew(entry.id, edits)
                    if (saved) setEditingId(null)
                    return saved
                  }}
                />
              ) : (
                <p className="history-notes">{entry.notes || 'No tasting notes for this brew.'}</p>
              )}
              <div className="history-bottom">
                <span className="history-stars">
                  {entry.rating === null
                    ? 'Unrated'
                    : Array.from({ length: entry.rating }, (_, i) => (
                        <Star key={i} size={14} fill="currentColor" />
                      ))}
                </span>
                <button
                  className="text-button"
                  onClick={() => setEditingId(entry.id)}
                  disabled={editingId !== null}
                >
                  Edit brew
                </button>
                <button className="text-button" onClick={() => onLoad(entry.recipe)}>
                  Use this recipe
                  <ArrowRight size={15} />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
      <p className="library-footnote">
        Your collection stays on this browser. Export a backup to keep a copy or move to another
        device.
      </p>
    </>
  )
}
