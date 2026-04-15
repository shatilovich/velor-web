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

const STATUS_BORDER: Record<ZoneStatus, string> = {
  idle: 'rgba(255,255,255,0.06)',
  paused: 'rgba(255,255,255,0.12)',
  ok: 'rgba(34,197,94,0.5)',
  warn: 'rgba(249,115,22,0.5)',
  danger: 'rgba(239,68,68,0.6)',
}

const STATUS_GLOW: Record<ZoneStatus, string> = {
  idle: 'none',
  paused: 'none',
  ok: '0 0 20px rgba(34,197,94,0.12)',
  warn: '0 0 20px rgba(249,115,22,0.15)',
  danger: '0 0 24px rgba(239,68,68,0.2)',
}

const STATUS_LABEL_COLOR: Record<ZoneStatus, string> = {
  idle: 'var(--text-secondary)',
  paused: 'var(--text-secondary)',
  ok: '#22c55e',
  warn: '#f97316',
  danger: '#ef4444',
}

function statusLine(_elapsed: number, limit: number, status: ZoneStatus): string {
  const limitText = formatTime(limit)
  switch (status) {
    case 'idle': return `Лимит ${limitText}`
    case 'paused': return `Пауза · ${limitText}`
    case 'ok': return `Идёт · ${limitText}`
    case 'warn': return `Почти лимит · ${limitText}`
    case 'danger': return `Время вышло · ${limitText}`
  }
}

export function ZoneCard({ zone, elapsed, limit, progress, status, isRunning, onTap, onLongPress }: ZoneCardProps) {
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const didLongPress = useRef(false)
  const info = ZONE_INFO[zone]

  const handlePointerDown = useCallback(() => {
    didLongPress.current = false
    longPressTimer.current = setTimeout(() => {
      didLongPress.current = true
      if (isRunning) {
        resetVibrate()
        onLongPress()
      }
    }, 600)
  }, [isRunning, onLongPress])

  const handlePointerUp = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
    if (!didLongPress.current) {
      tapVibrate()
      onTap()
    }
  }, [onTap])

  const handlePointerLeave = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }, [])

  const titleLines = info.title.split('\n')

  return (
    <div
      className={`zone-card zone-card--${status}${status === 'danger' ? ' zone-card--pulse' : ''}`}
      style={{
        borderColor: STATUS_BORDER[status],
        boxShadow: STATUS_GLOW[status],
      }}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerLeave}
      onContextMenu={e => e.preventDefault()}
    >
      {/* Subtle gradient overlay */}
      <div className="zone-card__gradient" />

      <div className="zone-card__top">
        <div className="zone-card__title">
          {titleLines[0]}
          <br />
          <span className="zone-card__title-line2">{titleLines[1]}</span>
        </div>
        <Ring progress={progress} status={status} size={44} />
      </div>

      <div className="zone-card__bottom">
        <div className="zone-card__time">{formatTime(elapsed)}</div>
        <div className="zone-card__status" style={{ color: STATUS_LABEL_COLOR[status] }}>
          {statusLine(elapsed, limit, status)}
        </div>
      </div>

      {/* Running indicator dot */}
      {isRunning && (
        <div className={`zone-card__dot zone-card__dot--${status}`} />
      )}
    </div>
  )
}
