/// <reference lib="webworker" />

import { clientsClaim } from 'workbox-core'
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching'

declare let self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<string | { url: string; revision: string | null }>
}

const DEFAULT_ICON = '/icon-192.png'
const DEFAULT_BADGE = '/icon-192.png'
const DEFAULT_TITLE = 'Velor'
const DEFAULT_URL = '/'

clientsClaim()
self.skipWaiting()
cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)

interface PushPayload {
  title?: string
  body?: string
  icon?: string
  badge?: string
  tag?: string
  url?: string
  data?: Record<string, unknown>
  renotify?: boolean
  requireInteraction?: boolean
  notification?: {
    title?: string
    body?: string
    icon?: string
    badge?: string
    tag?: string
    navigate?: string
    data?: Record<string, unknown>
    renotify?: boolean
    requireInteraction?: boolean
  }
}

function parsePushPayload(event: PushEvent): PushPayload {
  if (!event.data) return {}

  try {
    return event.data.json() as PushPayload
  } catch {
    return { body: event.data.text() }
  }
}

function normalizeNotification(payload: PushPayload) {
  const notification = payload.notification
  const title = notification?.title?.trim() || payload.title?.trim() || DEFAULT_TITLE
  const body = notification?.body ?? payload.body ?? 'Откройте приложение, чтобы проверить таймеры.'
  const url = notification?.navigate ?? payload.url ?? DEFAULT_URL

  const options: NotificationOptions & { renotify?: boolean } = {
    body,
    icon: notification?.icon ?? payload.icon ?? DEFAULT_ICON,
    badge: notification?.badge ?? payload.badge ?? DEFAULT_BADGE,
    tag: notification?.tag ?? payload.tag ?? `velor-${Date.now()}`,
    renotify: notification?.renotify ?? payload.renotify ?? false,
    requireInteraction: notification?.requireInteraction ?? payload.requireInteraction ?? false,
    data: {
      url,
      ...payload.data,
      ...notification?.data,
    },
  }

  return { title, options }
}

self.addEventListener('push', event => {
  const payload = parsePushPayload(event)
  const { title, options } = normalizeNotification(payload)

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', event => {
  const targetUrl = String(event.notification.data?.url ?? DEFAULT_URL)
  event.notification.close()

  event.waitUntil((async () => {
    const allClients = await self.clients.matchAll({
      type: 'window',
      includeUncontrolled: true,
    })

    for (const client of allClients) {
      if ('focus' in client) {
        await client.focus()
        if ('navigate' in client) {
          await client.navigate(targetUrl)
        }
        return
      }
    }

    await self.clients.openWindow(targetUrl)
  })())
})

self.addEventListener('pushsubscriptionchange', event => {
  event.waitUntil((async () => {
    const oldOptions = event.oldSubscription?.options
    if (!oldOptions) return

    await self.registration.pushManager.subscribe({
      userVisibleOnly: oldOptions.userVisibleOnly,
      applicationServerKey: oldOptions.applicationServerKey ?? undefined,
    })

    const clients = await self.clients.matchAll({
      type: 'window',
      includeUncontrolled: true,
    })

    clients.forEach(client => {
      client.postMessage({ type: 'velor-push-subscription-changed' })
    })
  })())
})
