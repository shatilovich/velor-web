import { useState, useCallback, useEffect } from 'react'
import { type Zone, ALL_ZONES } from './models/types'
import { ZoneGrid } from './components/ZoneGrid'
import { MenuView } from './components/MenuView'
import { useStore, useActions } from './store/useStore'
import { tapVibrate, pauseVibrate, resetVibrate } from './utils/haptics'

export default function App() {
  const { stopwatches, settings } = useStore()
  const {
    ensureNotifications,
    pauseAll,
    resumeAll,
    resetAll,
    resetSettings,
    resetZone,
    toggleZone,
    updateSettings,
  } = useActions()
  const [showMenu, setShowMenu] = useState(false)
  const [confirmResetAll, setConfirmResetAll] = useState(false)

  useEffect(() => {
    const root = document.documentElement
    if (settings.theme === 'system') {
      root.removeAttribute('data-theme')
      return
    }

    root.setAttribute('data-theme', settings.theme)
  }, [settings.theme])

  const handleTapZone = useCallback((zone: Zone) => {
    ensureNotifications()
    toggleZone(zone)
  }, [ensureNotifications, toggleZone])

  const handleLongPressZone = useCallback((zone: Zone) => {
    if (stopwatches[zone].isRunning) {
      resetZone(zone)
    }
  }, [resetZone, stopwatches])

  const hasRunning = ALL_ZONES.some(zone => stopwatches[zone].isRunning)
  const hasAnyStopped = ALL_ZONES.some(zone => !stopwatches[zone].isRunning && stopwatches[zone].elapsedSeconds > 0)

  return (
    <div className="app">
      <header className="app-header">
        <div className="velor-brand">
          <span className="velor-brand__mark" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M12 3l8 4.5v9L12 21 4 16.5v-9L12 3z" stroke="#A73AFD" strokeWidth="2" strokeLinejoin="round"/>
              <path d="M12 7.5l4 2.5v4l-4 2.5-4-2.5v-4l4-2.5z" fill="#A73AFD"/>
            </svg>
          </span>
          <h1 className="app-title">Velor</h1>
        </div>
        <div className="header-actions">
          <button
            className="header-btn"
            type="button"
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
            type="button"
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
            type="button"
            onClick={() => {
              pauseVibrate()
              pauseAll()
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="4" width="4" height="16" rx="1.5" />
              <rect x="14" y="4" width="4" height="16" rx="1.5" />
            </svg>
            Пауза
          </button>
        )}

        {!hasRunning && hasAnyStopped && (
          <button
            className="resume-all-btn"
            type="button"
            onClick={() => {
              tapVibrate()
              resumeAll()
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M7 4.5v15a1 1 0 0 0 1.5.87l13-7.5a1 1 0 0 0 0-1.74l-13-7.5A1 1 0 0 0 7 4.5z"/>
            </svg>
            Продолжить
          </button>
        )}
      </main>

      {showMenu && (
        <MenuView
          settings={settings}
          onUpdateSettings={updateSettings}
          onResetSettings={resetSettings}
          onClose={() => setShowMenu(false)}
        />
      )}

      {confirmResetAll && (
        <div className="confirm-overlay" onClick={() => setConfirmResetAll(false)}>
          <div className="confirm-dialog confirm-dialog--reset-all" onClick={e => e.stopPropagation()}>
            <div className="confirm-dialog__header">
              <div className="confirm-dialog__copy">
                <h3>Сбросить все таймеры?</h3>
                <p>Все 4 зоны будут обнулены. Это действие нельзя отменить.</p>
              </div>
              <button
                className="confirm-close-btn"
                type="button"
                aria-label="Закрыть"
                onClick={() => setConfirmResetAll(false)}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path
                    d="M4 4L12 12M12 4L4 12"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>
            <div className="confirm-actions confirm-actions--reset-all">
              <button className="confirm-btn confirm-btn--cancel" type="button" onClick={() => setConfirmResetAll(false)}>Отменить</button>
              <button
                className="confirm-btn confirm-btn--danger"
                type="button"
                onClick={() => {
                  resetVibrate()
                  resetAll()
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
