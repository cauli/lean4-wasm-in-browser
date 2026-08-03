/**
 * Run a callback only after a continuous period without a heartbeat.
 *
 * Keeping this helper independent of React makes the timeout behavior easy to
 * exercise without starting the large browser Lean runtime.
 */
export function createInactivityWatchdog(
  timeoutMs,
  onTimeout,
  timers = globalThis,
) {
  let timer = null

  const stop = () => {
    if (timer === null) return
    timers.clearTimeout(timer)
    timer = null
  }

  const pulse = () => {
    stop()
    timer = timers.setTimeout(() => {
      timer = null
      onTimeout()
    }, timeoutMs)
  }

  pulse()
  return { pulse, stop }
}
