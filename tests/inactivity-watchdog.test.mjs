import assert from 'node:assert/strict'
import test from 'node:test'

import { createInactivityWatchdog } from '../src/game/inactivity-watchdog.js'

function fakeTimers() {
  let nextId = 0
  const pending = new Map()
  return {
    api: {
      setTimeout(callback) {
        const id = ++nextId
        pending.set(id, callback)
        return id
      },
      clearTimeout(id) {
        pending.delete(id)
      },
    },
    fireOnlyTimer() {
      assert.equal(pending.size, 1)
      const [[id, callback]] = pending
      pending.delete(id)
      callback()
    },
    pendingCount() {
      return pending.size
    },
    onlyTimerId() {
      assert.equal(pending.size, 1)
      return pending.keys().next().value
    },
  }
}

test('the compile watchdog expires after a full period without activity', () => {
  const timers = fakeTimers()
  let timeouts = 0
  createInactivityWatchdog(600_000, () => { timeouts += 1 }, timers.api)

  timers.fireOnlyTimer()
  assert.equal(timeouts, 1)
})

test('each Lean progress heartbeat starts a fresh inactivity period', () => {
  const timers = fakeTimers()
  let timeouts = 0
  const watchdog = createInactivityWatchdog(600_000, () => { timeouts += 1 }, timers.api)

  assert.equal(timers.pendingCount(), 1)
  const initialTimer = timers.onlyTimerId()
  watchdog.pulse()
  const timerAfterFirstHeartbeat = timers.onlyTimerId()
  assert.notEqual(timerAfterFirstHeartbeat, initialTimer)
  watchdog.pulse()
  assert.notEqual(timers.onlyTimerId(), timerAfterFirstHeartbeat)
  assert.equal(timers.pendingCount(), 1)
  assert.equal(timeouts, 0)

  timers.fireOnlyTimer()
  assert.equal(timeouts, 1)
})

test('stopping the watchdog leaves no timeout behind', () => {
  const timers = fakeTimers()
  const watchdog = createInactivityWatchdog(600_000, () => {
    assert.fail('a stopped watchdog must not fire')
  }, timers.api)

  watchdog.stop()
  assert.equal(timers.pendingCount(), 0)
})
