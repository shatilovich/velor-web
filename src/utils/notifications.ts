export async function requestNotificationPermission() {
  if (!('Notification' in window)) return
  if (Notification.permission === 'default') {
    await Notification.requestPermission()
  }
}

export function sendNotification(title: string, body: string) {
  if (!('Notification' in window)) return
  if (Notification.permission !== 'granted') return

  try {
    new Notification(title, {
      body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: `velor-${Date.now()}`,
    })
  } catch {
    // On some mobile browsers, Notification constructor may fail
    // Use service worker registration instead
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.ready.then(reg => {
        reg.showNotification(title, {
          body,
          icon: '/icon-192.png',
          badge: '/icon-192.png',
        })
      })
    }
  }
}
