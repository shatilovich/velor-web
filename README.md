# Velor Web

PWA-таймер для мастера с поддержкой локальных уведомлений и Web Push.

## Что важно для iOS

- Фоновые push-уведомления на iPhone работают только для установленной PWA (`Add to Home Screen`).
- Одного `Notifications API` из страницы недостаточно: когда iOS сворачивает приложение, JS на странице засыпает.
- Для реальной доставки в фоне нужен Web Push: `Service Worker` + `Push API` + backend, который отправляет push в моменты `warn` и `danger`.

## Переменные окружения

Создайте `.env.local`:

```bash
VITE_WEB_PUSH_PUBLIC_KEY=your_vapid_public_key
VITE_WEB_PUSH_SYNC_URL=https://your-domain.tld/api/push/sync
```

## Контракт `POST /api/push/sync`

Фронтенд отправляет один payload, из которого backend должен:

- сохранить или обновить `PushSubscription`
- связать подписку с `deviceId`
- отменить старые задания
- запланировать новые push для `warnAt` и `dangerAt`

Пример тела запроса:

```json
{
  "deviceId": "8f5a0c30-7f17-4f0a-b2d6-1b3bbd8f61e0",
  "installed": true,
  "ios": true,
  "permission": "granted",
  "subscription": {
    "endpoint": "https://web.push.apple.com/...",
    "expirationTime": null,
    "keys": {
      "p256dh": "...",
      "auth": "..."
    }
  },
  "timezone": "Asia/Yekaterinburg",
  "locale": "ru-RU",
  "userAgent": "Mozilla/5.0 ...",
  "syncedAt": "2026-04-15T08:30:00.000Z",
  "timers": [
    {
      "id": "lashLeft",
      "title": "Левая ресница",
      "isRunning": true,
      "status": "ok",
      "elapsedSeconds": 120,
      "limitSeconds": 600,
      "warnAt": "2026-04-15T08:36:00.000Z",
      "dangerAt": "2026-04-15T08:38:00.000Z"
    }
  ]
}
```

## Ожидаемый payload push

`service worker` понимает оба варианта:

```json
{
  "title": "Внимание",
  "body": "Левая ресница — приближается лимит",
  "tag": "velor-lashLeft-warn",
  "url": "/"
}
```

или

```json
{
  "notification": {
    "title": "Лимит превышен",
    "body": "Левая ресница — время вышло!",
    "tag": "velor-lashLeft-danger",
    "navigate": "/"
  }
}
```

## Запуск

```bash
npm install
npm run build
npm run preview
```

Для проверки iOS используйте HTTPS и установленную Home Screen PWA.
