/* Weighted buzzes: 6 tab, 10 sheet, 14 send, 16 approve, 24 error.
   Works on Android; iOS Safari has no vibration API, so this quietly does nothing there. */
export function haptic(ms = 8) {
  try { navigator.vibrate?.(ms) } catch { /* not supported */ }
}
