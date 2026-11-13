import { useEffect, useRef, useState } from 'react'
import {
  ArrowDownToLine,
  ArrowRight,
  Beaker,
  Bookmark,
  Check,
  Clock3,
  Moon,
  Settings2,
  SlidersHorizontal,
  Sun,
  WifiOff,
  X,
} from 'lucide-react'
import Editor from './components/Editor'
import Brew from './components/Brew'
import Library from './components/Library'
import { Toggle } from './components/Controls'
import { DEFAULT_RECIPE, isBalanced } from './lib/recipe'
import type { Recipe } from './lib/recipe'
import {
  emptyLibrary,
  MAX_BACKUP_BYTES,
  importBackup,
  readEditor,
  readLibrary,
  writeEditor,
  writeLibrary,
} from './lib/storage'
import type { Library as LibraryData } from './lib/storage'
import { editBrew } from './lib/editBrew'

interface InstallPrompt extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: string }>
}
const SETTINGS_KEY = 'pour-lab.settings.v1'
function loadInitial() {
  let recipe = structuredClone(DEFAULT_RECIPE),
    library = emptyLibrary(),
    error = ''
  let settings = {
    dark: window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false,
    autoStart: true,
    wake: true,
  }
  try {
    recipe = readEditor()
  } catch (e) {
    error = e instanceof Error ? e.message : 'Browser storage is unavailable.'
  }
  try {
    library = readLibrary()
  } catch (e) {
    error = e instanceof Error ? e.message : 'Browser storage is unavailable.'
  }
  try {
    const s = JSON.parse(localStorage.getItem(SETTINGS_KEY) || 'null')
    if (
      s &&
      typeof s.dark === 'boolean' &&
      typeof s.autoStart === 'boolean' &&
      typeof s.wake === 'boolean'
    )
      settings = s
  } catch {
    /* Settings are optional; defaults stay usable when storage is unavailable. */
  }
  return { recipe, library, settings, error }
}

export default function App() {
  const [initial] = useState(loadInitial)
  const [recipe, setRecipeState] = useState(initial.recipe)
  const [library, setLibrary] = useState(initial.library)
  const libraryRef = useRef(library)
  const [settings, setSettings] = useState(initial.settings)
  const [screen, setScreen] = useState<'editor' | 'library' | 'brew'>('editor')
  const [tab, setTab] = useState<'recipes' | 'history'>('recipes')
  const [brewing, setBrewing] = useState<Recipe | null>(null)
  const [toast, setToast] = useState('')
  const [error, setError] = useState(initial.error)
  const [modal, setModal] = useState<'save' | 'settings' | null>(null)
  const [name, setName] = useState(recipe.name)
  const [online, setOnline] = useState(navigator.onLine)
  const [installPrompt, setInstallPrompt] = useState<InstallPrompt | null>(null)
  const dialog = useRef<HTMLDialogElement>(null)
  const notify = (message: string) => setToast(message)
  useEffect(() => {
    document.documentElement.dataset.theme = settings.dark ? 'dark' : 'light'
  }, [settings.dark])
  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(''), 6500)
    return () => window.clearTimeout(timer)
  }, [toast])
  useEffect(() => {
    if (modal) dialog.current?.showModal()
    else dialog.current?.close()
  }, [modal])
  useEffect(() => {
    const handleOnline = () => setOnline(navigator.onLine)
    const handleInstall = (e: Event) => {
      e.preventDefault()
      setInstallPrompt(e as InstallPrompt)
    }
    const installed = () => {
      setInstallPrompt(null)
      notify('Pour Lab is installed. Your next cup is a tap away.')
    }
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOnline)
    window.addEventListener('beforeinstallprompt', handleInstall)
    window.addEventListener('appinstalled', installed)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOnline)
      window.removeEventListener('beforeinstallprompt', handleInstall)
      window.removeEventListener('appinstalled', installed)
    }
  }, [])
  const setRecipe = (r: Recipe) => {
    setRecipeState(r)
    try {
      writeEditor(r)
    } catch {
      setError(
        'Your edits are in memory, but browser storage could not save them. Export a backup before closing.',
      )
    }
  }
  const persist = (next: LibraryData) => {
    try {
      writeLibrary(next)
      libraryRef.current = next
      setLibrary(next)
      return true
    } catch {
      setError(
        'Could not save to browser storage. Your library has not changed. Export a backup and check available storage.',
      )
      return false
    }
  }
  const changeSettings = (next: typeof settings) => {
    setSettings(next)
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(next))
    } catch {
      notify('Settings apply now, but could not be saved for next time.')
    }
  }
  const loadRecipe = (r: Recipe) => {
    setRecipe(structuredClone(r))
    setScreen('editor')
    notify(`${r.name} loaded.`)
    window.scrollTo(0, 0)
  }
  const navigate = (target: 'editor' | 'recipes' | 'history') => {
    if (target === 'editor') setScreen('editor')
    else {
      setScreen('library')
      setTab(target)
    }
    window.scrollTo(0, 0)
  }
  const install = async () => {
    if (installPrompt) {
      await installPrompt.prompt()
      await installPrompt.userChoice
      setInstallPrompt(null)
    } else {
      setModal('settings')
    }
  }
  return (
    <div className={`app-shell ${screen === 'brew' ? 'is-brewing' : ''}`}>
      <header className="app-header">
        <div className="header-inner">
          <button className="brand" onClick={() => navigate('editor')} aria-label="Pour Lab home">
            <span className="brand-mark">
              <Beaker size={23} strokeWidth={1.5} />
            </span>
            <span>
              pour<span className="brand-light">lab</span>
              <small>THE ART OF A BETTER CUP</small>
            </span>
          </button>
          {screen !== 'brew' && (
            <nav className="main-nav" aria-label="Main navigation">
              <button
                className={screen === 'editor' ? 'active' : ''}
                onClick={() => navigate('editor')}
              >
                <SlidersHorizontal size={15} />
                Recipe editor
              </button>
              <button
                className={screen === 'library' && tab === 'recipes' ? 'active' : ''}
                onClick={() => navigate('recipes')}
              >
                <Bookmark size={15} />
                Saved recipes
              </button>
              <button
                className={screen === 'library' && tab === 'history' ? 'active' : ''}
                onClick={() => navigate('history')}
              >
                <Clock3 size={15} />
                Brew history
              </button>
            </nav>
          )}
          <div className="header-actions">
            {!online && (
              <span className="offline-label">
                <WifiOff size={13} />
                <span>Offline</span>
              </span>
            )}
            <button
              className="icon-button theme-button"
              aria-label={settings.dark ? 'Switch to light mode' : 'Switch to dark mode'}
              onClick={() => changeSettings({ ...settings, dark: !settings.dark })}
            >
              {settings.dark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button
              className="icon-button"
              aria-label="Settings"
              onClick={() => setModal('settings')}
            >
              <Settings2 size={18} />
            </button>
            <button className="install-button" onClick={() => void install()}>
              <ArrowDownToLine size={14} />
              <span>Install app</span>
            </button>
          </div>
        </div>
      </header>
      <main className="main-container">
        {error && (
          <div className="error-banner" role="alert">
            <span>{error}</span>
            <button className="icon-button" aria-label="Dismiss error" onClick={() => setError('')}>
              <X size={16} />
            </button>
          </div>
        )}
        {screen === 'editor' && (
          <Editor
            recipe={recipe}
            setRecipe={setRecipe}
            notify={notify}
            onSave={() => {
              setName(recipe.name)
              setModal('save')
            }}
            onBrew={() => {
              if (isBalanced(recipe)) {
                setToast('')
                setBrewing(structuredClone(recipe))
                setScreen('brew')
                window.scrollTo(0, 0)
              }
            }}
          />
        )}
        {screen === 'brew' && brewing && (
          <Brew
            recipe={brewing}
            autoStart={settings.autoStart}
            wakeDefault={settings.wake}
            onExit={() => {
              setScreen('editor')
              setBrewing(null)
            }}
            onSave={(brew) => {
              const ok = persist({ ...library, brews: [...library.brews, brew] })
              if (ok) notify('Brew saved to your journal.')
              return ok
            }}
          />
        )}
        {screen === 'library' && (
          <Library
            library={library}
            tab={tab}
            onEditBrew={(id, edits) => {
              try {
                if (!persist(editBrew(libraryRef.current, id, edits))) return false
                notify('Brew updated in your journal.')
                return true
              } catch (error) {
                setError(error instanceof Error ? error.message : 'Unable to update this brew.')
                return false
              }
            }}
            setTab={setTab}
            onLoad={loadRecipe}
            onNew={() => {
              setRecipe(structuredClone(DEFAULT_RECIPE))
              setScreen('editor')
            }}
            onDuplicate={(id) => {
              const entry = library.recipes.find((r) => r.id === id)
              if (
                entry &&
                persist({
                  ...library,
                  recipes: [
                    ...library.recipes,
                    {
                      ...entry,
                      id: crypto.randomUUID(),
                      recipe: { ...entry.recipe, name: `${entry.recipe.name.slice(0, 93)} (copy)` },
                      createdAt: new Date().toISOString(),
                    },
                  ],
                })
              )
                notify('Recipe duplicated.')
            }}
            onDelete={(id, kind) => {
              if (persist({ ...library, [kind]: library[kind].filter((r) => r.id !== id) }))
                notify(kind === 'recipes' ? 'Recipe deleted.' : 'Brew deleted.')
            }}
            onImport={async (file) => {
              try {
                if (file.size > MAX_BACKUP_BYTES)
                  throw new Error('Choose a backup smaller than 5 MB.')
                const text = await file.text()
                const next = importBackup(text, libraryRef.current)
                if (persist(next)) notify('Backup imported. Existing entries were preserved.')
              } catch (e) {
                setError(
                  e instanceof Error
                    ? e.message
                    : 'Unable to read this backup. No data was changed.',
                )
              }
            }}
          />
        )}
      </main>
      {screen !== 'brew' && (
        <footer className="app-footer">
          <div>
            <span className="footer-brand">pourlab</span>
            <span>Crafted for the curious coffee drinker.</span>
          </div>
          <span>
            LESS GUESSWORK. MORE GOOD COFFEE. <span className="footer-dot">●</span>
          </span>
        </footer>
      )}
      {toast && (
        <div className="toast" role="status">
          <Check size={16} />
          <span>{toast}</span>
          <button aria-label="Dismiss notification" onClick={() => setToast('')}>
            <X size={14} />
          </button>
        </div>
      )}
      <dialog
        ref={dialog}
        className="app-dialog"
        onCancel={() => setModal(null)}
        onClick={(e) => {
          if (e.target === e.currentTarget) setModal(null)
        }}
      >
        <div className="dialog-heading">
          <h2>{modal === 'save' ? 'Keep a good recipe.' : 'Make yourself at home.'}</h2>
          <button className="icon-button" aria-label="Close dialog" onClick={() => setModal(null)}>
            <X size={19} />
          </button>
        </div>
        {modal === 'save' ? (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              const clean = name.trim()
              if (!clean) return
              const nextRecipe = { ...recipe, name: clean }
              if (
                persist({
                  ...library,
                  recipes: [
                    ...library.recipes,
                    {
                      id: crypto.randomUUID(),
                      recipe: nextRecipe,
                      createdAt: new Date().toISOString(),
                    },
                  ],
                })
              ) {
                setRecipe(nextRecipe)
                setModal(null)
                notify(`“${clean}” saved to your recipes.`)
              }
            }}
          >
            <p>Give this pour plan a name you’ll come back to.</p>
            <label className="input-label" htmlFor="recipe-name">
              Recipe name
            </label>
            <input
              id="recipe-name"
              className="text-input"
              value={name}
              maxLength={100}
              required
              autoFocus
              onChange={(e) => setName(e.target.value)}
            />
            <button className="primary-button" disabled={!name.trim()}>
              Save recipe
              <ArrowRight size={17} />
            </button>
          </form>
        ) : (
          <div className="settings-content">
            <Toggle
              label="Dark mode"
              description="A softer light for early mornings."
              checked={settings.dark}
              onChange={(v) => changeSettings({ ...settings, dark: v })}
            />
            <Toggle
              label="Start timer automatically"
              description="Turn off to start it yourself in Brew Mode."
              checked={settings.autoStart}
              onChange={(v) => changeSettings({ ...settings, autoStart: v })}
            />
            <Toggle
              label="Keep screen awake during brews"
              description="Where supported by your browser."
              checked={settings.wake}
              onChange={(v) => changeSettings({ ...settings, wake: v })}
            />
            <div className="install-guide">
              <span className="eyebrow">TAKE THE LAB WITH YOU</span>
              <h3>One tap closer to your next cup.</h3>
              <p>
                On Android, open Pour Lab in Chrome, then use the browser menu →{' '}
                <strong>Add to Home screen</strong> → <strong>Install</strong>. On iPhone, use
                Safari → Share → Add to Home Screen.
              </p>
              <p>
                Once loaded and cached, Pour Lab works offline. Your recipes stay on this browser;
                export backups from Saved recipes.
              </p>
              {installPrompt && (
                <button className="primary-button" onClick={() => void install()}>
                  <ArrowDownToLine size={16} />
                  Install Pour Lab
                </button>
              )}
            </div>
            <small className="settings-version">
              POUR LAB · VERSION 1.0 · MADE FOR YOUR DAILY RITUAL
            </small>
          </div>
        )}
      </dialog>
    </div>
  )
}
