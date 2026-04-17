import { useRef, useCallback } from 'react'
import { type Zone, type ZoneStatus, ZONE_INFO } from '../models/types'
import { Ring } from './Ring'
import { formatTime } from '../utils/time'
import { tapVibrate, resetVibrate } from '../utils/haptics'

interface ZoneCardProps {
  zone: Zone
  elapsed: number
  limit: number
  progress: number
  status: ZoneStatus
  isRunning: boolean
  onTap: () => void
  onLongPress: () => void
}

function statusLine(limit: number, status: ZoneStatus): string {
  const limitText = formatTime(limit)
  switch (status) {
    case 'idle': return `Лимит ${limitText}`
    case 'paused': return `Пауза · лимит ${limitText}`
    case 'ok': return `Идёт · лимит ${limitText}`
    case 'warn': return `Почти лимит · ${limitText}`
    case 'danger': return `Время вышло · ${limitText}`
  }
}

export function ZoneCard({ zone, elapsed, limit, progress, status, isRunning, onTap, onLongPress }: ZoneCardProps) {
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const didLongPress = useRef(false)
  const info = ZONE_INFO[zone]

  const clearLongPressTimer = useCallback(() => {
    if (!longPressTimer.current) return

    clearTimeout(longPressTimer.current)
    longPressTimer.current = null
  }, [])

  const handlePointerDown = useCallback(() => {
    didLongPress.current = false
    clearLongPressTimer()
    longPressTimer.current = setTimeout(() => {
      didLongPress.current = true
      if (isRunning) {
        resetVibrate()
        onLongPress()
      }
    }, 600)
  }, [clearLongPressTimer, isRunning, onLongPress])

  const handlePointerUp = useCallback(() => {
    clearLongPressTimer()
    if (!didLongPress.current) {
      tapVibrate()
      onTap()
    }
  }, [clearLongPressTimer, onTap])

  const handlePointerLeave = useCallback(() => {
    clearLongPressTimer()
  }, [clearLongPressTimer])

  return (
    <div
      className={`zone-card zone-card--${status}${status === 'danger' ? ' zone-card--pulse' : ''}`}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerLeave}
      onPointerCancel={handlePointerLeave}
      onContextMenu={e => e.preventDefault()}
    >
      <div className="zone-card__top">
        <div className="zone-card__title">
          {info.title.split('\n').map((line, i) => (
            <span key={i}>{line}<br /></span>
          ))}
        </div>
        <Ring progress={progress} status={status} size={40} />
      </div>
      <div className="zone-card__bottom">
        <div className="zone-card__time">{formatTime(elapsed)}</div>
        <div className={`zone-card__status zone-card__status--${status}`}>
          {statusLine(limit, status)}
        </div>
      </div>
    </div>
  )
}
