export function vibrate(pattern: number | number[]) {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
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
