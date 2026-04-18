import { type ZoneStatus } from '../models/types'

interface RingProps {
  progress: number
  status: ZoneStatus
  size?: number
}

const STATUS_COLORS: Record<ZoneStatus, string> = {
  idle:   'var(--ring-neutral)',
  paused: 'var(--ring-neutral)',
  ok:     'var(--color-ok)',
  warn:   'var(--color-warn)',
  danger: 'var(--color-danger)',
}

export function Ring({ progress, status, size = 44 }: RingProps) {
  const strokeWidth = 4
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - progress)
  const center = size / 2

  return (
    <svg width={size} height={size} className="ring">
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke="var(--ring-track)"
        strokeWidth={strokeWidth}
      />
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke={STATUS_COLORS[status]}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${center} ${center})`}
        style={{ transition: 'stroke-dashoffset 0.3s ease-out, stroke 0.3s ease' }}
      />
    </svg>
  )
}
