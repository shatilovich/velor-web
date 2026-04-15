export function vibrate(pattern: number | number[]) {
  if ('vibrate' in navigator) {
    navigator.vibrate(pattern)
  }
}

export function tapVibrate() {
  vibrate(10)
}

export function pauseVibrate() {
  vibrate(30)
}

export function resetVibrate() {
  vibrate([50, 30, 50])
}

export function warningVibrate() {
  vibrate([100, 50, 100])
}

export function dangerVibrate() {
  vibrate([200, 100, 200, 100, 200])
}
