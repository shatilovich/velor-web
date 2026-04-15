const DEVICE_ID_KEY = 'velor_push_device_id_v1'
const PENDING_PUSH_SYNC_KEY = 'velor_pending_push_sync_v1'
const PUSH_ICON = '/icon-192.png'
const PUSH_BADGE = '/icon-192.png'
const PUSH_NAVIGATE_URL = '/'
const PUSH_SYNC_URL = import.meta.env.VITE_WEB_PUSH_SYNC_URL?.trim() ?? ''
const VAPID_PUBLIC_KEY = import.meta.env.VITE_WEB_PUSH_PUBLIC_KEY?.trim() ?? ''

let serviceWorkerReadyPromise: Promise<ServiceWorkerRegistration | null> | null = null
let swMessageListenerBound = false
let onlineListenerBound = false

export interface PushTimerSchedule {
  id: string
  title: string
  isRunning: boolean
  status: 'idle' | 'paused' | 'ok' | 'warn' | 'danger'
  elapsedSeconds: number
  limitSeconds: number
  warnAt: string | null
  dangerAt: string | null
  autoPauseAt: string | null
}

interface PushSyncState {
  timers: PushTimerSchedule[]
}

interface PushSyncPayload extends PushSyncState {
  deviceId: string
  installed: boolean
  ios: boolean
  permission: NotificationPermission | 'unsupported'
  subscription: PushSubscriptionJSON | null
  timezone: string
  locale: string
  userAgent: string
  syncedAt: string
}

interface NotificationOptionsInput {
  tag?: string
  url?: string
  data?: Record<string, unknown>
  renotify?: boolean
  requireInteraction?: boolean
}

function canUseNotifications() {
  return typeof window !== 'undefined' && 'Notification' in window
}

function canUseServiceWorkers() {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator
}

function canUsePushManager() {
  return canUseServiceWorkers() && 'PushManager' in window
}

function isIOS() {
  if (typeof navigator === 'undefined') return false
  return /iPad|iPhone|iPod/.test(navigator.userAgent)
}

function isStandalonePwa() {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true
}

function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!canUseNotifications()) return 'unsupported'
  return Notification.permission
}

function getDeviceId() {
  if (typeof localStorage === 'undefined') return 'unknown-device'

  const existing = localStorage.getItem(DEVICE_ID_KEY)
  if (existing) return existing

  const created = crypto.randomUUID()
  localStorage.setItem(DEVICE_ID_KEY, created)
  return created
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = `${base64String}${padding}`.replaceAll('-', '+').replaceAll('_', '/')
  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i)
  }

  return outputArray
}

async function getServiceWorkerRegistration() {
  if (!canUseServiceWorkers()) return null

  serviceWorkerReadyPromise ??= navigator.serviceWorker.ready
    .then(registration => registration)
    .catch(() => null)

  return serviceWorkerReadyPromise
}

function bindServiceWorkerEvents() {
  if (!canUseServiceWorkers() || swMessageListenerBound) return

  navigator.serviceWorker.addEventListener('message', event => {
    if (event.data?.type === 'velor-push-subscription-changed') {
      void ensurePushSubscription()
        .then(() => flushPendingPushSync())
        .catch(() => undefined)
    }
  })

  swMessageListenerBound = true
}

function bindOnlineRetry() {
  if (typeof window === 'undefined' || onlineListenerBound) return

  window.addEventListener('online', () => {
    void flushPendingPushSync()
  })

  onlineListenerBound = true
}

export async function bootstrapNotifications() {
  bindServiceWorkerEvents()
  bindOnlineRetry()

  await getServiceWorkerRegistration()

  if (getNotificationPermission() === 'granted') {
    await ensurePushSubscription()
    await flushPendingPushSync()
  }
}

export async function requestNotificationPermission() {
  if (!canUseNotifications()) return 'unsupported' as const

  const permission = Notification.permission === 'default'
    ? await Notification.requestPermission()
    : Notification.permission

  if (permission === 'granted') {
    await ensurePushSubscription()
    await flushPendingPushSync()
  }

  return permission
}

async function ensurePushSubscription() {
  if (!canUsePushManager()) return null
  if (Notification.permission !== 'granted') return null
  if (!VAPID_PUBLIC_KEY) return null

  const registration = await getServiceWorkerRegistration()
  if (!registration) return null

  const current = await registration.pushManager.getSubscription()
  if (current) return current

  return registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
  })
}

async function getPushSubscriptionSnapshot() {
  if (!canUsePushManager()) return null

  const registration = await getServiceWorkerRegistration()
  if (!registration) return null

  const subscription = await registration.pushManager.getSubscription()
  return subscription?.toJSON() ?? null
}

function savePendingPushSync(payload: PushSyncPayload) {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(PENDING_PUSH_SYNC_KEY, JSON.stringify(payload))
}

function loadPendingPushSync() {
  if (typeof localStorage === 'undefined') return null

  const raw = localStorage.getItem(PENDING_PUSH_SYNC_KEY)
  if (!raw) return null

  try {
    return JSON.parse(raw) as PushSyncPayload
  } catch {
    localStorage.removeItem(PENDING_PUSH_SYNC_KEY)
    return null
  }
}

function clearPendingPushSync() {
  if (typeof localStorage === 'undefined') return
  localStorage.removeItem(PENDING_PUSH_SYNC_KEY)
}

async function postPushSync(payload: PushSyncPayload) {
  if (!PUSH_SYNC_URL) return

  const response = await fetch(PUSH_SYNC_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
    keepalive: true,
  })

  if (!response.ok) {
    throw new Error(`Push sync failed with status ${response.status}`)
  }
}

function buildNotificationOptions(body: string, options: NotificationOptionsInput): NotificationOptions {
  const notificationOptions: NotificationOptions & { renotify?: boolean } = {
    body,
    icon: PUSH_ICON,
    badge: PUSH_BADGE,
    tag: options.tag ?? `velor-${Date.now()}`,
    data: {
      url: options.url ?? PUSH_NAVIGATE_URL,
      ...options.data,
    },
    renotify: options.renotify ?? false,
    requireInteraction: options.requireInteraction ?? false,
  }

  return notificationOptions
}

export async function syncPushState(state: PushSyncState) {
  if (!PUSH_SYNC_URL || typeof window === 'undefined') return

  const payload: PushSyncPayload = {
    ...state,
    deviceId: getDeviceId(),
    installed: isStandalonePwa(),
    ios: isIOS(),
    permission: getNotificationPermission(),
    subscription: await getPushSubscriptionSnapshot(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    locale: navigator.language,
    userAgent: navigator.userAgent,
    syncedAt: new Date().toISOString(),
  }

  try {
    await postPushSync(payload)
    clearPendingPushSync()
  } catch {
    savePendingPushSync(payload)
  }
}

export async function flushPendingPushSync() {
  if (!PUSH_SYNC_URL) return

  const pending = loadPendingPushSync()
  if (!pending) return

  try {
    await postPushSync({
      ...pending,
      permission: getNotificationPermission(),
      subscription: await getPushSubscriptionSnapshot(),
      syncedAt: new Date().toISOString(),
    })
    clearPendingPushSync()
  } catch {
    // Keep the last payload and retry when the app comes back online.
  }
}

export function sendNotification(title: string, body: string, options: NotificationOptionsInput = {}) {
  if (!canUseNotifications()) return
  if (Notification.permission !== 'granted') return

  const notificationOptions = buildNotificationOptions(body, options)

  void (async () => {
    const registration = await getServiceWorkerRegistration()

    if (registration) {
      await registration.showNotification(title, notificationOptions)
      return
    }

    new Notification(title, notificationOptions)
  })().catch(() => undefined)
}
