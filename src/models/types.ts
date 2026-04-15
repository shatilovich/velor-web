export type Zone = 'lashLeft' | 'lashRight' | 'browLeft' | 'browRight'

export const ALL_ZONES: Zone[] = ['lashLeft', 'lashRight', 'browLeft', 'browRight']

export type ZoneStatus = 'idle' | 'paused' | 'ok' | 'warn' | 'danger'

export interface ZoneStopwatch {
  elapsedSeconds: number
  isRunning: boolean
  startedAt: number | null // timestamp ms
  baseElapsedSeconds: number
}

export interface ZoneInfo {
  id: Zone
  title: string
  subtitle: string
  defaultLimitSeconds: number
}

export const ZONE_INFO: Record<Zone, ZoneInfo> = {
  lashLeft: { id: 'lashLeft', title: 'Левая\nресница', subtitle: 'Ресницы', defaultLimitSeconds: 10 * 60 },
  lashRight: { id: 'lashRight', title: 'Правая\nресница', subtitle: 'Ресницы', defaultLimitSeconds: 10 * 60 },
  browLeft: { id: 'browLeft', title: 'Левая\nбровь', subtitle: 'Брови', defaultLimitSeconds: 6 * 60 },
  browRight: { id: 'browRight', title: 'Правая\nбровь', subtitle: 'Брови', defaultLimitSeconds: 6 * 60 },
}

export interface AppSettings {
  warnPercent: number
  limits: Record<Zone, number> // seconds
  theme: 'system' | 'light' | 'dark'
}

export function createDefaultStopwatch(): ZoneStopwatch {
  return { elapsedSeconds: 0, isRunning: false, startedAt: null, baseElapsedSeconds: 0 }
}

export function getStatus(zone: Zone, sw: ZoneStopwatch, settings: AppSettings): ZoneStatus {
  if (sw.elapsedSeconds === 0 && !sw.isRunning) return 'idle'
  if (!sw.isRunning) return 'paused'
  const limit = Math.max(60, settings.limits[zone])
  const warnAt = Math.floor(limit * settings.warnPercent)
  if (sw.elapsedSeconds >= limit) return 'danger'
  if (sw.elapsedSeconds >= warnAt) return 'warn'
  return 'ok'
}

export function getProgress(zone: Zone, sw: ZoneStopwatch, settings: AppSettings): number {
  const limit = Math.max(60, settings.limits[zone])
  return Math.min(1, sw.elapsedSeconds / limit)
}
