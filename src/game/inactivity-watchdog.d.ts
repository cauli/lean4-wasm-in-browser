export interface WatchdogTimers {
  setTimeout(callback: () => void, timeoutMs: number): ReturnType<typeof setTimeout>
  clearTimeout(timer: ReturnType<typeof setTimeout>): void
}

export interface InactivityWatchdog {
  pulse(): void
  stop(): void
}

export function createInactivityWatchdog(
  timeoutMs: number,
  onTimeout: () => void,
  timers?: WatchdogTimers,
): InactivityWatchdog
