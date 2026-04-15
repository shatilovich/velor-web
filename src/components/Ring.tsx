import { type ZoneStatus } from '../models/types'

interface RingProps {
  progress: number
  status: ZoneStatus
  size?: number
}

const STATUS_COLORS: Record<ZoneStatus, string> = {
  idle: 'var(--ring-neutral)',
  paused: 'var(--ring-paused)',
  ok: '#22c55e',
  warn: '#f97316',
  danger: '#ef4444',
}

const STATUS_GLOW: Record<ZoneStatus, string> = {
  idle: 'none',
  paused: 'none',
  ok: '0 0 10px rgba(34,197,94,0.6)',
  warn: '0 0 10px rgba(249,115,22,0.6)',
  danger: '0 0 12px rgba(239,68,68,0.8)',
}

export function Ring({ progress, status, size = 44 }: RingProps) {
  const strokeWidth = 4
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - progress)
  const center = size / 2

  return (
    <svg
      width={size}
      height={size}
      style={{ filter: STATUS_GLOW[status] !== 'none' ? `drop-shadow(${STATUS_GLOW[status]})` : undefined }}
    >
      <circle
        cx={center} cy={center} r={radius}
        fill="none"
        stroke="var(--ring-track)"
        strokeWidth={strokeWidth}
      />
      <circle
        cx={center} cy={center} r={radius}
        fill="none"
        stroke={STATUS_COLORS[status]}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${center} ${center})`}
        style={{ transition: 'stroke-dashoffset 0.4s cubic-bezier(0.4,0,0.2,1), stroke 0.3s ease' }}
      />
    </svg>
  )
}
