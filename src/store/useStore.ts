import { useSyncExternalStore } from 'react'
import {
  type Zone, type ZoneStopwatch, type AppSettings,
  ALL_ZONES, ZONE_INFO, createDefaultStopwatch, getStatus,
} from '../models/types'
import { vibrate } from '../utils/haptics'
import {
  type PushTimerSchedule,
  requestNotificationPermission,
  sendNotification,
  syncPushState,
} from '../utils/notifications'

const STORAGE_KEY = 'velor_stopwatches_v1'
const SETTINGS_KEY = 'velor_settings_v1'
const BACKGROUNDED_AT_KEY = 'velor_backgrounded_at_v1'
const BACKGROUND_IDLE_TIMEOUT_MS = 60 * 60 * 1000

// ---- Settings ----

function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return defaultSettings()
}

function defaultSettings(): AppSettings {
  const limits = {} as Record<Zone, number>
  ALL_ZONES.forEach(z => { limits[z] = ZONE_INFO[z].defaultLimitSeconds })
  return { warnPercent: 0.8, limits, theme: 'system' }
}

function saveSettings(s: AppSettings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s))
}

// ---- Stopwatch state ----

interface StoreState {
  stopwatches: Record<Zone, ZoneStopwatch>
  settings: AppSettings
}

function loadStopwatches(): Record<Zone, ZoneStopwatch> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Record<Zone, ZoneStopwatch>
      const result = {} as Record<Zone, ZoneStopwatch>
      ALL_ZONES.forEach(z => {
        result[z] = parsed[z] ?? createDefaultStopwatch()
      })
      return result
    }
  } catch { /* ignore */ }
  const result = {} as Record<Zone, ZoneStopwatch>
  ALL_ZONES.forEach(z => { result[z] = createDefaultStopwatch() })
  return result
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

// ---- External store ----

let state: StoreState = {
  stopwatches: loadStopwatches(),
  settings: loadSettings(),
}

const lastStatuses: Record<string, string> = {}

const listeners = new Set<() => void>()

function emit() {
  listeners.forEach(fn => fn())
}

function getSnapshot() { return state }

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

function setState(partial: Partial<StoreState>) {
  state = { ...state, ...partial }
  emit()
}

// Refresh elapsed for running zones based on wall clock
function refreshRunning(items: Record<Zone, ZoneStopwatch>, now: number): Record<Zone, ZoneStopwatch> {
  const updated = { ...items }
  ALL_ZONES.forEach(z => {
    const sw = updated[z]
    if (sw.isRunning && sw.startedAt != null) {
      const delta = Math.floor((now - sw.startedAt) / 1000)
      updated[z] = { ...sw, elapsedSeconds: Math.max(0, sw.baseElapsedSeconds + delta) }
    }
  })
  return updated
}

function pauseRunningTimers(items: Record<Zone, ZoneStopwatch>): Record<Zone, ZoneStopwatch> {
  const updated = { ...items }

  ALL_ZONES.forEach(z => {
    const sw = updated[z]
    if (!sw.isRunning) return

    updated[z] = {
      ...sw,
      isRunning: false,
      startedAt: null,
      baseElapsedSeconds: sw.elapsedSeconds,
    }
  })

  return updated
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

  const capped = refreshRunning(items, autoPauseAt)
  return {
    items: pauseRunningTimers(capped),
    autoPaused: true,
  }
}

function handleStatusTransitions(items: Record<Zone, ZoneStopwatch>, settings: AppSettings) {
  ALL_ZONES.forEach(z => {
    const sw = items[z]
    const newStatus = getStatus(z, sw, settings)
    const oldStatus = lastStatuses[z]
    lastStatuses[z] = newStatus

    if (!sw.isRunning) return
    if (oldStatus === newStatus) return

    const zoneName = ZONE_INFO[z].title.replace('\n', ' ')

    if (newStatus === 'warn') {
      vibrate([100, 50, 100])
      sendNotification('Внимание', `${zoneName} — приближается лимит`, {
        tag: `velor-${z}-warn`,
        data: { zone: z, level: 'warn' },
      })
    } else if (newStatus === 'danger') {
      vibrate([200, 100, 200, 100, 200])
      sendNotification('Лимит превышен', `${zoneName} — время вышло!`, {
        tag: `velor-${z}-danger`,
        data: { zone: z, level: 'danger' },
        renotify: true,
      })
    }
  })
}

// Prime cache without side effects
function primeStatusCache(items: Record<Zone, ZoneStopwatch>, settings: AppSettings) {
  ALL_ZONES.forEach(z => {
    lastStatuses[z] = getStatus(z, items[z], settings)
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
    const limitSeconds = Math.max(60, settings.limits[zone])
    const warnAtSeconds = Math.floor(limitSeconds * settings.warnPercent)

    return {
      id: zone,
      title: ZONE_INFO[zone].title.replace('\n', ' '),
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
  void syncPushState({
    timers: getPushSchedules(items, settings),
  })
}

// Initialize
{
  const now = Date.now()
  const backgroundedAt = loadBackgroundedAt()
  const restored = restoreAfterBackground(state.stopwatches, now, backgroundedAt)
  state = { ...state, stopwatches: restored.items }
  primeStatusCache(restored.items, state.settings)
  saveStopwatches(restored.items)

  if (typeof document === 'undefined' || document.visibilityState === 'visible') {
    clearBackgroundedAt()
  }
}

// ---- Ticker ----

let tickerInterval: ReturnType<typeof setInterval> | null = null

function syncTicker() {
  const hasRunning = ALL_ZONES.some(z => state.stopwatches[z].isRunning)
  if (hasRunning && !tickerInterval) {
    tickerInterval = setInterval(() => {
      const now = Date.now()
      const updated = refreshRunning(state.stopwatches, now)
      handleStatusTransitions(updated, state.settings)
      setState({ stopwatches: updated })
    }, 1000)
  } else if (!hasRunning && tickerInterval) {
    clearInterval(tickerInterval)
    tickerInterval = null
  }
}

syncTicker()

// ---- Actions ----

export function toggleZone(zone: Zone) {
  const items = { ...state.stopwatches }
  const sw = { ...items[zone] }

  if (sw.isRunning) {
    if (sw.startedAt != null) {
      const delta = Math.floor((Date.now() - sw.startedAt) / 1000)
      sw.elapsedSeconds = Math.max(0, sw.baseElapsedSeconds + delta)
    }
    sw.isRunning = false
    sw.startedAt = null
  } else {
    sw.isRunning = true
    sw.baseElapsedSeconds = sw.elapsedSeconds
    sw.startedAt = Date.now()
  }

  items[zone] = sw
  setState({ stopwatches: items })
  primeStatusCache(items, state.settings)
  saveStopwatches(items)
  syncTicker()
  syncPushTimers(items, state.settings)
}

export function resetZone(zone: Zone) {
  const items = { ...state.stopwatches }
  items[zone] = createDefaultStopwatch()
  setState({ stopwatches: items })
  primeStatusCache(items, state.settings)
  saveStopwatches(items)
  syncTicker()
  syncPushTimers(items, state.settings)
}

export function resetAll() {
  const items = {} as Record<Zone, ZoneStopwatch>
  ALL_ZONES.forEach(z => { items[z] = createDefaultStopwatch() })
  setState({ stopwatches: items })
  primeStatusCache(items, state.settings)
  saveStopwatches(items)
  syncTicker()
  syncPushTimers(items, state.settings)
}

export function pauseAll() {
  const now = Date.now()
  const refreshed = refreshRunning(state.stopwatches, now)
  const items = pauseRunningTimers(refreshed)
  setState({ stopwatches: items })
  primeStatusCache(items, state.settings)
  saveStopwatches(items)
  syncTicker()
  syncPushTimers(items, state.settings)
}

export function updateSettings(partial: Partial<AppSettings>) {
  const newSettings = { ...state.settings, ...partial }
  setState({ settings: newSettings })
  saveSettings(newSettings)
  primeStatusCache(state.stopwatches, newSettings)
  syncPushTimers(state.stopwatches, newSettings)
}

export function resetSettings() {
  const def = defaultSettings()
  setState({ settings: def })
  saveSettings(def)
  primeStatusCache(state.stopwatches, def)
  syncPushTimers(state.stopwatches, def)
}

// ---- Visibility change (like appDidBecomeActive / willResignActive) ----

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      const now = Date.now()
      const backgroundedAt = loadBackgroundedAt()
      const restored = restoreAfterBackground(state.stopwatches, now, backgroundedAt)
      const updated = restored.items

      if (restored.autoPaused) {
        primeStatusCache(updated, state.settings)
      } else {
        handleStatusTransitions(updated, state.settings)
      }

      setState({ stopwatches: updated })
      saveStopwatches(updated)
      clearBackgroundedAt()
      syncTicker()
      syncPushTimers(updated, state.settings)
    } else {
      const now = Date.now()
      const updated = refreshRunning(state.stopwatches, now)
      primeStatusCache(updated, state.settings)
      setState({ stopwatches: updated })
      saveStopwatches(updated)
      saveBackgroundedAt(now)
      if (tickerInterval) {
        clearInterval(tickerInterval)
        tickerInterval = null
      }
      syncPushTimers(updated, state.settings)
    }
  })
}

// Request notification permission on first interaction
let notifRequested = false
export function ensureNotifications() {
  if (!notifRequested) {
    notifRequested = true
    requestNotificationPermission()
  }
}

// ---- Hook ----

export function useStore() {
  const snap = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  return snap
}

export function useActions() {
  return {
    toggleZone,
    resetZone,
    resetAll,
    pauseAll,
    updateSettings,
    resetSettings,
    ensureNotifications,
  }
}
