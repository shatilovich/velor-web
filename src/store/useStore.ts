import { useSyncExternalStore } from 'react'
import {
  type AppSettings,
  type Zone,
  type ZoneStatus,
  type ZoneStopwatch,
  ALL_ZONES,
  ZONE_INFO,
  clampZoneLimit,
  createDefaultStopwatch,
  createZoneRecord,
  getStatus,
  normalizeZoneTitle,
} from '../models/types'
import { vibrate } from '../utils/haptics'
import {
  type PushTimerSchedule,
  cancelZoneNotifications,
  requestNotificationPermission,
  scheduleTimerNotifications,
  sendNotification,
  syncPushState,
} from '../utils/notifications'

const STORAGE_KEY = 'velor_stopwatches_v1'
const SETTINGS_KEY = 'velor_settings_v1'
const BACKGROUNDED_AT_KEY = 'velor_backgrounded_at_v1'
const BACKGROUND_IDLE_TIMEOUT_MS = 60 * 60 * 1000

interface StoreState {
  stopwatches: Record<Zone, ZoneStopwatch>
  settings: AppSettings
}

function createDefaultStopwatches(): Record<Zone, ZoneStopwatch> {
  return createZoneRecord(() => createDefaultStopwatch())
}

function defaultSettings(): AppSettings {
  return {
    warnPercent: 0.8,
    limits: createZoneRecord(zone => ZONE_INFO[zone].defaultLimitSeconds),
    theme: 'system',
  }
}

function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (raw) return JSON.parse(raw) as AppSettings
  } catch {
    // Ignore corrupted settings and fall back to defaults.
  }

  return defaultSettings()
}

function saveSettings(settings: AppSettings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
}

function loadStopwatches(): Record<Zone, ZoneStopwatch> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return createDefaultStopwatches()

    const parsed = JSON.parse(raw) as Partial<Record<Zone, ZoneStopwatch>>
    return createZoneRecord(zone => parsed[zone] ?? createDefaultStopwatch())
  } catch {
    return createDefaultStopwatches()
  }
}

function saveStopwatches(items: Record<Zone, ZoneStopwatch>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
}

function loadBackgroundedAt() {
  try {
    const raw = localStorage.getItem(BACKGROUNDED_AT_KEY)
    if (!raw) return null

    const value = Number(raw)
    return Number.isFinite(value) ? value : null
  } catch {
    return null
  }
}

function saveBackgroundedAt(timestamp: number) {
  localStorage.setItem(BACKGROUNDED_AT_KEY, String(timestamp))
}

function clearBackgroundedAt() {
  localStorage.removeItem(BACKGROUNDED_AT_KEY)
}

let state: StoreState = {
  stopwatches: loadStopwatches(),
  settings: loadSettings(),
}

const lastStatuses: Record<Zone, ZoneStatus> = createZoneRecord(() => 'idle')
const listeners = new Set<() => void>()

function emit() {
  listeners.forEach(listener => listener())
}

function getSnapshot() {
  return state
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function setState(partial: Partial<StoreState>) {
  state = { ...state, ...partial }
  emit()
}

function getElapsedSeconds(sw: ZoneStopwatch, now: number) {
  if (!sw.isRunning || sw.startedAt == null) {
    return sw.elapsedSeconds
  }

  const delta = Math.floor((now - sw.startedAt) / 1000)
  return Math.max(0, sw.baseElapsedSeconds + delta)
}

function refreshStopwatch(sw: ZoneStopwatch, now: number): ZoneStopwatch {
  if (!sw.isRunning || sw.startedAt == null) return sw

  const elapsedSeconds = getElapsedSeconds(sw, now)
  if (elapsedSeconds === sw.elapsedSeconds) return sw

  return { ...sw, elapsedSeconds }
}

function startStopwatch(sw: ZoneStopwatch, now: number): ZoneStopwatch {
  return {
    ...sw,
    isRunning: true,
    startedAt: now,
    baseElapsedSeconds: sw.elapsedSeconds,
  }
}

function pauseStopwatch(sw: ZoneStopwatch, now: number): ZoneStopwatch {
  if (!sw.isRunning) return sw

  const elapsedSeconds = getElapsedSeconds(sw, now)
  return {
    ...sw,
    elapsedSeconds,
    isRunning: false,
    startedAt: null,
    baseElapsedSeconds: elapsedSeconds,
  }
}

function refreshRunning(items: Record<Zone, ZoneStopwatch>, now: number): Record<Zone, ZoneStopwatch> {
  return createZoneRecord(zone => refreshStopwatch(items[zone], now))
}

function pauseRunningTimers(items: Record<Zone, ZoneStopwatch>, now: number): Record<Zone, ZoneStopwatch> {
  return createZoneRecord(zone => pauseStopwatch(items[zone], now))
}

function restoreAfterBackground(
  items: Record<Zone, ZoneStopwatch>,
  now: number,
  backgroundedAt: number | null,
): { items: Record<Zone, ZoneStopwatch>; autoPaused: boolean } {
  if (backgroundedAt == null) {
    return { items: refreshRunning(items, now), autoPaused: false }
  }

  const autoPauseAt = backgroundedAt + BACKGROUND_IDLE_TIMEOUT_MS
  if (now < autoPauseAt) {
    return { items: refreshRunning(items, now), autoPaused: false }
  }

  const cappedItems = refreshRunning(items, autoPauseAt)
  return {
    items: pauseRunningTimers(cappedItems, autoPauseAt),
    autoPaused: true,
  }
}

function handleStatusTransitions(items: Record<Zone, ZoneStopwatch>, settings: AppSettings) {
  ALL_ZONES.forEach(zone => {
    const sw = items[zone]
    const newStatus = getStatus(zone, sw, settings)
    const previousStatus = lastStatuses[zone]
    lastStatuses[zone] = newStatus

    if (!sw.isRunning || previousStatus === newStatus) return

    const zoneName = normalizeZoneTitle(zone)

    if (newStatus === 'warn') {
      vibrate([100, 50, 100])
      sendNotification('Внимание', `${zoneName} — приближается лимит`, {
        tag: `velor-${zone}-warn`,
        data: { zone, level: 'warn' },
      })
      void cancelZoneNotifications(zone, 'warn')
    } else if (newStatus === 'danger') {
      vibrate([200, 100, 200, 100, 200])
      sendNotification('Лимит превышен', `${zoneName} — время вышло!`, {
        tag: `velor-${zone}-danger`,
        data: { zone, level: 'danger' },
        renotify: true,
      })
      void cancelZoneNotifications(zone, 'danger')
    }
  })
}

function primeStatusCache(items: Record<Zone, ZoneStopwatch>, settings: AppSettings) {
  ALL_ZONES.forEach(zone => {
    lastStatuses[zone] = getStatus(zone, items[zone], settings)
  })
}

function getTargetTimestamp(sw: ZoneStopwatch, targetSeconds: number) {
  if (!sw.isRunning) return null

  const remainingSeconds = targetSeconds - sw.elapsedSeconds
  if (remainingSeconds <= 0) return new Date().toISOString()

  return new Date(Date.now() + remainingSeconds * 1000).toISOString()
}

function getPushSchedules(items: Record<Zone, ZoneStopwatch>, settings: AppSettings): PushTimerSchedule[] {
  return ALL_ZONES.map(zone => {
    const sw = items[zone]
    const limitSeconds = clampZoneLimit(settings.limits[zone])
    const warnAtSeconds = Math.floor(limitSeconds * settings.warnPercent)

    return {
      id: zone,
      title: normalizeZoneTitle(zone),
      isRunning: sw.isRunning,
      status: getStatus(zone, sw, settings),
      elapsedSeconds: sw.elapsedSeconds,
      limitSeconds,
      warnAt: getTargetTimestamp(sw, warnAtSeconds),
      dangerAt: getTargetTimestamp(sw, limitSeconds),
      autoPauseAt: sw.isRunning ? new Date(Date.now() + BACKGROUND_IDLE_TIMEOUT_MS).toISOString() : null,
    }
  })
}

function syncPushTimers(items = state.stopwatches, settings = state.settings) {
  const schedules = getPushSchedules(items, settings)
  void syncPushState({ timers: schedules })
  void scheduleTimerNotifications(schedules)
}

let tickerInterval: ReturnType<typeof setInterval> | null = null

function stopTicker() {
  if (!tickerInterval) return

  clearInterval(tickerInterval)
  tickerInterval = null
}

function syncTicker() {
  const hasRunning = ALL_ZONES.some(zone => state.stopwatches[zone].isRunning)

  if (!hasRunning) {
    stopTicker()
    return
  }

  if (tickerInterval) return

  tickerInterval = setInterval(() => {
    const updated = refreshRunning(state.stopwatches, Date.now())
    handleStatusTransitions(updated, state.settings)
    setState({ stopwatches: updated })
  }, 1000)
}

function commitStopwatches(items: Record<Zone, ZoneStopwatch>, settings = state.settings) {
  setState({ stopwatches: items })
  primeStatusCache(items, settings)
  saveStopwatches(items)
  syncTicker()
  syncPushTimers(items, settings)
}

function commitSettings(settings: AppSettings) {
  setState({ settings })
  saveSettings(settings)
  primeStatusCache(state.stopwatches, settings)
  syncPushTimers(state.stopwatches, settings)
}

{
  const restored = restoreAfterBackground(state.stopwatches, Date.now(), loadBackgroundedAt())
  state = { ...state, stopwatches: restored.items }
  primeStatusCache(restored.items, state.settings)
  saveStopwatches(restored.items)

  if (typeof document === 'undefined' || document.visibilityState === 'visible') {
    clearBackgroundedAt()
  }
}

syncTicker()

export function toggleZone(zone: Zone) {
  const now = Date.now()
  const current = state.stopwatches[zone]
  const next = current.isRunning ? pauseStopwatch(current, now) : startStopwatch(current, now)

  commitStopwatches({
    ...state.stopwatches,
    [zone]: next,
  })
}

export function resetZone(zone: Zone) {
  commitStopwatches({
    ...state.stopwatches,
    [zone]: createDefaultStopwatch(),
  })
}

export function resetAll() {
  commitStopwatches(createDefaultStopwatches())
}

export function pauseAll() {
  const now = Date.now()
  const refreshed = refreshRunning(state.stopwatches, now)
  commitStopwatches(pauseRunningTimers(refreshed, now))
}

export function resumeAll() {
  const now = Date.now()
  const items = createZoneRecord(zone => {
    const sw = state.stopwatches[zone]
    if (!sw.isRunning && sw.elapsedSeconds > 0) return startStopwatch(sw, now)
    return sw
  })
  commitStopwatches(items)
}

export function updateSettings(partial: Partial<AppSettings>) {
  const nextSettings: AppSettings = {
    ...state.settings,
    ...partial,
    limits: partial.limits
      ? { ...state.settings.limits, ...partial.limits }
      : state.settings.limits,
  }

  commitSettings(nextSettings)
}

export function resetSettings() {
  commitSettings(defaultSettings())
}

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      const restored = restoreAfterBackground(state.stopwatches, Date.now(), loadBackgroundedAt())

      if (restored.autoPaused) {
        primeStatusCache(restored.items, state.settings)
      } else {
        handleStatusTransitions(restored.items, state.settings)
      }

      commitStopwatches(restored.items)
      clearBackgroundedAt()
      return
    }

    const now = Date.now()
    const updated = refreshRunning(state.stopwatches, now)
    primeStatusCache(updated, state.settings)
    setState({ stopwatches: updated })
    saveStopwatches(updated)
    saveBackgroundedAt(now)
    stopTicker()
    syncPushTimers(updated, state.settings)
  })
}

let notificationPermissionRequested = false

export function ensureNotifications() {
  if (notificationPermissionRequested) return

  notificationPermissionRequested = true
  void requestNotificationPermission()
}

const ACTIONS = {
  toggleZone,
  resetZone,
  resetAll,
  pauseAll,
  resumeAll,
  updateSettings,
  resetSettings,
  ensureNotifications,
}

export function useStore() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}

export function useActions() {
  return ACTIONS
}
