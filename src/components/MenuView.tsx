import React, { useState, useEffect, useRef } from 'react'
import { type Zone, type AppSettings, ALL_ZONES, ZONE_INFO } from '../models/types'
import { tapVibrate, resetVibrate } from '../utils/haptics'
import {
  getNotificationStatus,
  requestNotificationPermission,
  supportsBackgroundNotifications,
  type NotificationStatus,
} from '../utils/notifications'

const MIN_LIMIT_MINUTES = 1
const MAX_LIMIT_MINUTES = 30
const THEME_OPTIONS = [
  { value: 'system', label: 'Системная' },
  { value: 'light', label: 'Светлая' },
  { value: 'dark', label: 'Тёмная' },
] as const

function getMinutesByZone(limits: AppSettings['limits']): Record<Zone, number> {
  const localLimits = {} as Record<Zone, number>
  ALL_ZONES.forEach(zone => {
    localLimits[zone] = Math.max(MIN_LIMIT_MINUTES, Math.round(limits[zone] / 60))
  })
  return localLimits
}

interface MenuViewProps {
  settings: AppSettings
  onUpdateSettings: (partial: Partial<AppSettings>) => void
  onResetSettings: () => void
  onClose: () => void
}

export function MenuView({ settings, onUpdateSettings, onResetSettings, onClose }: MenuViewProps) {
  const [confirmReset, setConfirmReset] = useState(false)
  const [notifStatus, setNotifStatus] = useState<NotificationStatus>(() => getNotificationStatus())
  const [requestingNotif, setRequestingNotif] = useState(false)
  const ready = useRef(false)

  useEffect(() => {
    const id = requestAnimationFrame(() => { ready.current = true })
    return () => cancelAnimationFrame(id)
  }, [])

  // Refresh notif status when user returns from browser settings
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        setNotifStatus(getNotificationStatus())
      }
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])

  const [localLimits, setLocalLimits] = useState<Record<Zone, number>>(() => getMinutesByZone(settings.limits))

  useEffect(() => {
    setLocalLimits(getMinutesByZone(settings.limits))
  }, [settings.limits])

  const handleLimitChange = (zone: Zone, minutes: number) => {
    tapVibrate()
    const clamped = Math.max(MIN_LIMIT_MINUTES, Math.min(MAX_LIMIT_MINUTES, minutes))
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

  const handleRequestNotifications = async () => {
    setRequestingNotif(true)
    try {
      await requestNotificationPermission()
      setNotifStatus(getNotificationStatus())
    } finally {
      setRequestingNotif(false)
    }
  }

  const renderNotifContent = () => {
    const { permission, backgroundSupported, isIos, isPwa } = notifStatus

    if (permission === 'unsupported') {
      if (isIos && !isPwa) {
        return (
          <div className="notif-card notif-card--info">
            <div className="notif-card__icon notif-card__icon--info">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/>
                <line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            </div>
            <div className="notif-card__text">
              <div className="notif-card__title">Добавьте на экран «Домой»</div>
              <div className="notif-card__sub">Уведомления доступны только в установленном PWA</div>
            </div>
          </div>
        )
      }
      return (
        <div className="notif-card notif-card--info">
          <div className="notif-card__icon notif-card__icon--info">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              <line x1="1" y1="1" x2="23" y2="23"/>
            </svg>
          </div>
          <div className="notif-card__text">
            <div className="notif-card__title">Не поддерживается</div>
            <div className="notif-card__sub">Браузер не поддерживает уведомления</div>
          </div>
        </div>
      )
    }

    if (permission === 'denied') {
      return (
        <div className="notif-card notif-card--denied">
          <div className="notif-card__icon notif-card__icon--denied">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
            </svg>
          </div>
          <div className="notif-card__text">
            <div className="notif-card__title">Заблокированы</div>
            <div className="notif-card__sub">Разрешите уведомления в настройках браузера</div>
          </div>
        </div>
      )
    }

    if (permission === 'granted') {
      const bgOk = backgroundSupported ?? supportsBackgroundNotifications()
      return (
        <div className="notif-card notif-card--granted">
          <div className="notif-card__icon notif-card__icon--granted">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
          </div>
          <div className="notif-card__text">
            <div className="notif-card__title">{bgOk ? 'Фоновые уведомления' : 'Уведомления включены'}</div>
            <div className="notif-card__sub">{bgOk ? 'Срабатывают даже когда сайт закрыт' : 'Работают пока браузер открыт'}</div>
          </div>
          <div className="notif-check">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
        </div>
      )
    }

    // 'default' — not yet requested
    return (
      <div className="notif-card notif-card--default">
        <div className="notif-card__icon notif-card__icon--default">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
        </div>
        <div className="notif-card__text">
          <div className="notif-card__title">Уведомления</div>
          <div className="notif-card__sub">Таймер напомнит о приближении лимита</div>
        </div>
        <button
          className="notif-enable-btn"
          type="button"
          onClick={handleRequestNotifications}
          disabled={requestingNotif}
        >
          {requestingNotif ? '...' : 'Включить'}
        </button>
      </div>
    )
  }

  return (
    <div className="menu-overlay" onClick={() => { if (ready.current) onClose() }}>
      <div className="menu-sheet" onClick={e => e.stopPropagation()}>
        <div className="menu-header">
          <div className="menu-header__drag" />
          <h2>Настройки</h2>
          <button className="menu-done-btn" type="button" onClick={onClose}>Готово</button>
        </div>

        <div className="menu-content">

          <div className="menu-section">
            <div className="menu-section-title">Уведомления</div>
            {renderNotifContent()}
          </div>

          <div className="menu-section">
            <div className="menu-section-title">Лимиты по зонам</div>
            <div className="menu-group">
              {ALL_ZONES.map((zone, i) => {
                const info = ZONE_INFO[zone]
                const minutes = localLimits[zone]
                const isLast = i === ALL_ZONES.length - 1
                return (
                  <div key={zone} className={`menu-row${isLast ? ' menu-row--last' : ''}`}>
                    <div className="menu-row__info">
                      <div className="menu-row__label">{info.title.replace('\n', ' ')}</div>
                      <div className="menu-row__sublabel">{info.subtitle}</div>
                    </div>
                    <div className="wb-counter">
                      <button className="wb-counter__btn" type="button" disabled={minutes <= MIN_LIMIT_MINUTES} onClick={() => handleLimitChange(zone, minutes - 1)} aria-label="Минус">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M5 12h14"/></svg>
                      </button>
                      <div className="wb-counter__value">{minutes} <span>мин</span></div>
                      <button className="wb-counter__btn" type="button" disabled={minutes >= MAX_LIMIT_MINUTES} onClick={() => handleLimitChange(zone, minutes + 1)} aria-label="Плюс">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="menu-section">
            <div className="menu-section-title">Предупреждение</div>
            <div className="menu-group">
              <div className="menu-row menu-row--column menu-row--last">
                <div className="warn-row-header">
                  <div className="menu-row__label">Оранжевый порог</div>
                  <div className="warn-badge">{Math.round(settings.warnPercent * 100)}%</div>
                </div>
                <input
                  type="range"
                  min={0.6}
                  max={0.9}
                  step={0.05}
                  value={settings.warnPercent}
                  onChange={e => handleWarnChange(Number(e.target.value))}
                  className="menu-slider"
                  style={{ '--slider-fill': `${((settings.warnPercent - 0.6) / 0.3) * 100}%` } as React.CSSProperties}
                />
                <div className="menu-row__sublabel">
                  Зона окрашивается в оранжевый при достижении {Math.round(settings.warnPercent * 100)}% от лимита
                </div>
              </div>
            </div>
          </div>

          <div className="menu-section">
            <div className="menu-section-title">Тема</div>
            <div className="theme-picker">
              {THEME_OPTIONS.map(option => (
                <button
                  key={option.value}
                  type="button"
                  className={`theme-picker__btn${settings.theme === option.value ? ' theme-picker__btn--active' : ''}`}
                  onClick={() => handleThemeChange(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="menu-section">
            <button className="menu-reset-btn" type="button" onClick={() => setConfirmReset(true)}>
              Сбросить настройки
            </button>
          </div>

        </div>

        {confirmReset && (
          <div className="confirm-overlay" onClick={() => setConfirmReset(false)}>
            <div className="confirm-dialog" onClick={e => e.stopPropagation()}>
              <h3>Сбросить настройки?</h3>
              <p>Все лимиты и пороги вернутся к значениям по умолчанию.</p>
              <div className="confirm-actions">
                <button className="confirm-btn confirm-btn--cancel" type="button" onClick={() => setConfirmReset(false)}>Отменить</button>
                <button className="confirm-btn confirm-btn--danger" type="button" onClick={handleResetDefaults}>Сбросить</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
