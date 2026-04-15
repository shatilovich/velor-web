import { useState, useCallback, useEffect } from 'react'
import { ALL_ZONES } from './models/types'
import { ZoneGrid } from './components/ZoneGrid'
import { MenuView } from './components/MenuView'
import { useStore, useActions } from './store/useStore'
import { tapVibrate, pauseVibrate, resetVibrate } from './utils/haptics'

export default function App() {
  const { stopwatches, settings } = useStore()
  const actions = useActions()
  const [showMenu, setShowMenu] = useState(false)
  const [confirmResetAll, setConfirmResetAll] = useState(false)

  // Apply theme
  useEffect(() => {
    const root = document.documentElement
    if (settings.theme === 'dark') {
      root.setAttribute('data-theme', 'dark')
    } else if (settings.theme === 'light') {
      root.setAttribute('data-theme', 'light')
    } else {
      root.removeAttribute('data-theme')
    }
  }, [settings.theme])

  const handleTapZone = useCallback((zone: typeof ALL_ZONES[number]) => {
    actions.ensureNotifications()
    actions.toggleZone(zone)
  }, [actions])

  const handleLongPressZone = useCallback((zone: typeof ALL_ZONES[number]) => {
    if (stopwatches[zone].isRunning) {
      actions.resetZone(zone)
    }
  }, [actions, stopwatches])

  const hasRunning = ALL_ZONES.some(z => stopwatches[z].isRunning)

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">Velor</h1>
        <div className="header-actions">
          <button
            className="header-btn"
            onClick={() => {
              resetVibrate()
              setConfirmResetAll(true)
            }}
            aria-label="Сбросить все"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
            </svg>
          </button>
          <button
            className="header-btn"
            onClick={() => {
              tapVibrate()
              setShowMenu(true)
            }}
            aria-label="Настройки"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
        </div>
      </header>

      <main className="app-main">
        <ZoneGrid
          settings={settings}
          items={stopwatches}
          onTapZone={handleTapZone}
          onLongPressZone={handleLongPressZone}
        />

        {hasRunning && (
          <button
            className="pause-all-btn"
            onClick={() => {
              pauseVibrate()
              actions.pauseAll()
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="4" width="4" height="16" rx="1" />
              <rect x="14" y="4" width="4" height="16" rx="1" />
            </svg>
            Пауза
          </button>
        )}
      </main>

      {showMenu && (
        <MenuView
          settings={settings}
          onUpdateSettings={actions.updateSettings}
          onResetSettings={actions.resetSettings}
          onClose={() => setShowMenu(false)}
        />
      )}

      {confirmResetAll && (
        <div className="confirm-overlay" onClick={() => setConfirmResetAll(false)}>
          <div className="confirm-dialog" onClick={e => e.stopPropagation()}>
            <h3>Сбросить все таймеры?</h3>
            <p>Все 4 зоны будут обнулены. Это действие нельзя отменить.</p>
            <div className="confirm-actions">
              <button className="confirm-btn confirm-btn--cancel" onClick={() => setConfirmResetAll(false)}>Отменить</button>
              <button
                className="confirm-btn confirm-btn--danger"
                onClick={() => {
                  resetVibrate()
                  actions.resetAll()
                  setConfirmResetAll(false)
                }}
              >
                Сбросить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
