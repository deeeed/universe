/**
 * Formats a Date object into a readable string format.
 *
 * @param date - The Date object to be formatted.
 * @returns A formatted date string in the format "YYYY-MM-DD HH:mm:ss".
 */
export function formatDate(date?: Date | string | number): string {
  if (!date) {
    return '';
  }

  const dateObj = new Date(date);

  if (isNaN(dateObj.getTime())) {
    // Check for Invalid Date
    return 'Invalid date';
  }
  const pad = (num: number): string => num.toString().padStart(2, '0');

  const year = dateObj.getFullYear();
  const month = pad(dateObj.getMonth() + 1); // JavaScript months are 0-based.
  const day = pad(dateObj.getDate());
  const hours = pad(dateObj.getHours());
  const minutes = pad(dateObj.getMinutes());
  const seconds = pad(dateObj.getSeconds());

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}
