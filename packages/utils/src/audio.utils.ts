/**
 * Formats a duration in milliseconds to a string in the format mm:ss.
 *
 * @param {number} ms The duration in milliseconds to format.
 * @returns {string} The formatted time string in mm:ss format.
 */
export function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  // Pad the minutes and seconds with leading zeros if needed
  const paddedMinutes = String(minutes).padStart(2, '0');
  const paddedSeconds = String(seconds).padStart(2, '0');

  return `${paddedMinutes}:${paddedSeconds}`;
}

/**
 * Formats a duration in seconds to a human-readable string showing hours, minutes, and seconds.
 * For example, 7260 seconds would be formatted as '2h 1m 0s'.
 *
 * @param {number} seconds The number of seconds to format.
 * @returns {string} The formatted time string in h m s format.
 */
export function formatDurationFromSeconds(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secondsLeft = seconds % 60;

  const parts = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0 || hours > 0) parts.push(`${minutes}m`); // Ensure minutes are included if hours are present
  parts.push(`${secondsLeft}s`);

  return parts.join(' ');
}
