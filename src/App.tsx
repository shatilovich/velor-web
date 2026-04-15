import { useState, useCallback, useEffect } from 'react'
import { Button, Modal } from 'antd'
import { PauseOutlined, ReloadOutlined, SettingOutlined } from '@ant-design/icons'
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

  // Apply theme classes — CSS variables handle the actual look
  useEffect(() => {
    const root = document.documentElement
    if (settings.theme === 'light') {
      root.setAttribute('data-theme', 'light')
    } else {
      // dark or system → always render dark
      root.setAttribute('data-theme', 'dark')
    }
  }, [settings.theme])

  const handleTapZone = useCallback((zone: typeof ALL_ZONES[number]) => {
    actions.ensureNotifications()
    actions.toggleZone(zone)
  }, [actions])

  const handleLongPressZone = useCallback((zone: typeof ALL_ZONES[number]) => {
    if (stopwatches[zone].isRunning) actions.resetZone(zone)
  }, [actions, stopwatches])

  const hasRunning = ALL_ZONES.some(z => stopwatches[z].isRunning)

  return (
    <div className="app">
        {/* Background gradient orbs */}
        <div className="bg-orb bg-orb--1" />
        <div className="bg-orb bg-orb--2" />

        <header className="app-header">
          <div className="app-header__left">
            <div className="app-logo">V</div>
            <div>
              <div className="app-title">Velor</div>
              <div className="app-subtitle">Beauty Timers</div>
            </div>
          </div>
          <div className="header-actions">
            <button
              className="header-btn header-btn--destructive"
              onClick={() => { resetVibrate(); setConfirmResetAll(true) }}
              aria-label="Сбросить все"
            >
              <ReloadOutlined style={{ fontSize: 16 }} />
            </button>
            <button
              className="header-btn"
              onClick={() => { tapVibrate(); setShowMenu(true) }}
              aria-label="Настройки"
            >
              <SettingOutlined style={{ fontSize: 17 }} />
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

          <div className={`pause-container${hasRunning ? ' pause-container--visible' : ''}`}>
            <Button
              size="large"
              icon={<PauseOutlined />}
              onClick={() => { pauseVibrate(); actions.pauseAll() }}
              className="pause-all-btn"
              block
            >
              Пауза всех
            </Button>
          </div>
        </main>

        {showMenu && (
          <MenuView
            settings={settings}
            onUpdateSettings={actions.updateSettings}
            onResetSettings={actions.resetSettings}
            onClose={() => setShowMenu(false)}
          />
        )}

        <Modal
          open={confirmResetAll}
          onCancel={() => setConfirmResetAll(false)}
          onOk={() => { resetVibrate(); actions.resetAll(); setConfirmResetAll(false) }}
          okText="Сбросить"
          cancelText="Отменить"
          okButtonProps={{ danger: true }}
          title="Сбросить все таймеры?"
          centered
          styles={{
            content: { background: '#1a1a24', borderRadius: 20 },
            header: { background: '#1a1a24' },
            footer: { background: '#1a1a24' },
          }}
        >
          <p style={{ color: 'rgba(255,255,255,0.6)' }}>
            Все 4 зоны будут обнулены. Это действие нельзя отменить.
          </p>
        </Modal>
      </div>
  )
}
