import { useState, useEffect, useRef } from 'react'
import { type Zone, type AppSettings, ALL_ZONES, ZONE_INFO } from '../models/types'
import { tapVibrate, resetVibrate } from '../utils/haptics'

interface MenuViewProps {
  settings: AppSettings
  onUpdateSettings: (partial: Partial<AppSettings>) => void
  onResetSettings: () => void
  onClose: () => void
}

export function MenuView({ settings, onUpdateSettings, onResetSettings, onClose }: MenuViewProps) {
  const [confirmReset, setConfirmReset] = useState(false)
  const ready = useRef(false)
  useEffect(() => {
    const id = requestAnimationFrame(() => { ready.current = true })
    return () => cancelAnimationFrame(id)
  }, [])
  const [localLimits, setLocalLimits] = useState<Record<Zone, number>>(() => {
    const l = {} as Record<Zone, number>
    ALL_ZONES.forEach(z => { l[z] = Math.max(1, Math.round(settings.limits[z] / 60)) })
    return l
  })

  const handleLimitChange = (zone: Zone, minutes: number) => {
    tapVibrate()
    const clamped = Math.max(1, Math.min(30, minutes))
    setLocalLimits(prev => ({ ...prev, [zone]: clamped }))
    const newLimits = { ...settings.limits, [zone]: clamped * 60 }
    onUpdateSettings({ limits: newLimits })
  }

  const handleWarnChange = (value: number) => {
    onUpdateSettings({ warnPercent: value })
  }

  const handleThemeChange = (theme: AppSettings['theme']) => {
    tapVibrate()
    onUpdateSettings({ theme })
  }

  const handleResetDefaults = () => {
    resetVibrate()
    onResetSettings()
    onClose()
  }

  return (
    <div className="menu-overlay" onClick={() => { if (ready.current) onClose() }}>
      <div className="menu-sheet" onClick={e => e.stopPropagation()}>
        <div className="menu-header">
          <h2>Меню</h2>
          <button className="menu-done-btn" onClick={onClose}>Готово</button>
        </div>

        <div className="menu-content">
          <div className="menu-section">
            <div className="menu-section-title">Лимиты по зонам</div>
            {ALL_ZONES.map(zone => {
              const info = ZONE_INFO[zone]
              const minutes = localLimits[zone]
              return (
                <div key={zone} className="menu-row">
                  <div className="menu-row__info">
                    <div className="menu-row__label">{info.title.replace('\n', ' ')}</div>
                    <div className="menu-row__sublabel">{info.subtitle}</div>
                  </div>
                  <div className="menu-row__value">{minutes} мин</div>
                  <div className="stepper">
                    <button
                      className="stepper__btn"
                      disabled={minutes <= 1}
                      onClick={() => handleLimitChange(zone, minutes - 1)}
                    >−</button>
                    <button
                      className="stepper__btn"
                      disabled={minutes >= 30}
                      onClick={() => handleLimitChange(zone, minutes + 1)}
                    >+</button>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="menu-section">
            <div className="menu-section-title">Предупреждение</div>
            <div className="menu-row menu-row--column">
              <div className="menu-row__label">Оранжевый порог</div>
              <input
                type="range"
                min={0.6}
                max={0.9}
                step={0.05}
                value={settings.warnPercent}
                onChange={e => handleWarnChange(Number(e.target.value))}
                className="menu-slider"
              />
              <div className="menu-row__sublabel">
                Оранжевый при ~{Math.round(settings.warnPercent * 100)}% лимита
              </div>
            </div>
          </div>

          <div className="menu-section">
            <div className="menu-section-title">Тема</div>
            <div className="theme-picker">
              {(['system', 'light', 'dark'] as const).map(t => (
                <button
                  key={t}
                  className={`theme-picker__btn${settings.theme === t ? ' theme-picker__btn--active' : ''}`}
                  onClick={() => handleThemeChange(t)}
                >
                  {t === 'system' ? 'Системная' : t === 'light' ? 'Светлая' : 'Тёмная'}
                </button>
              ))}
            </div>
          </div>

          <div className="menu-section">
            <button
              className="menu-reset-btn"
              onClick={() => setConfirmReset(true)}
            >
              Сбросить настройки
            </button>
            <div className="menu-row__sublabel" style={{ marginTop: 8 }}>
              Вернём лимиты зон и порог предупреждения к значениям по умолчанию.
            </div>
          </div>
        </div>

        {confirmReset && (
          <div className="confirm-overlay" onClick={() => setConfirmReset(false)}>
            <div className="confirm-dialog" onClick={e => e.stopPropagation()}>
              <h3>Сбросить настройки?</h3>
              <p>Все лимиты и пороги вернутся к значениям по умолчанию.</p>
              <div className="confirm-actions">
                <button className="confirm-btn confirm-btn--cancel" onClick={() => setConfirmReset(false)}>Отменить</button>
                <button className="confirm-btn confirm-btn--danger" onClick={handleResetDefaults}>Сбросить</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
