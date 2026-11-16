/**
 * High-Resolution Monotonic Timer Utility
 * 
 * Uses Node.js `process.hrtime.bigint()` to measure elapsed time with nanosecond
 * precision, immune to system wall-clock adjustments or NTP drift.
 */

/**
 * Returns current monotonic time in nanoseconds as BigInt.
 * @returns {bigint}
 */
export function now() {
  return process.hrtime.bigint();
}

/**
 * Calculates the difference between two monotonic timestamps in milliseconds.
 * Rounds to 2 decimal places (e.g., 14.35 ms).
 * 
 * @param {bigint} startTime - Start timestamp from now()
 * @param {bigint} [endTime=process.hrtime.bigint()] - Optional end timestamp
 * @returns {number} Elapsed duration in milliseconds
 */
export function diffMs(startTime, endTime = process.hrtime.bigint()) {
  if (typeof startTime !== 'bigint') {
    throw new TypeError('startTime must be a BigInt from timer.now()');
  }
  
  const diffNs = endTime - startTime;
  // 1 millisecond = 1,000,000 nanoseconds
  const diffMilliseconds = Number(diffNs) / 1e6;
  return Number(diffMilliseconds.toFixed(2));
}

export default {
  now,
  diffMs,
};
