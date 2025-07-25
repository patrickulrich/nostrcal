/**
 * Format hour display based on 12/24 hour preference
 */
export function formatHour(hour: number, is24Hour: boolean): string {
  if (is24Hour) {
    return hour.toString().padStart(2, '0') + ':00';
  }
  
  if (hour === 0) return '12 AM';
  if (hour < 12) return `${hour} AM`;
  if (hour === 12) return '12 PM';
  return `${hour - 12} PM`;
}

/**
 * Format time display based on 12/24 hour preference
 */
export function formatTime(date: Date, is24Hour: boolean): string {
  if (is24Hour) {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  }
  
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  const displayMinutes = minutes.toString().padStart(2, '0');
  
  return `${displayHours}:${displayMinutes} ${period}`;
}

/**
 * Format date and time display
 */
export function formatDateTime(timestamp: string, is24Hour: boolean): string {
  const date = new Date(parseInt(timestamp) * 1000);
  const dateStr = date.toLocaleDateString();
  const timeStr = formatTime(date, is24Hour);
  return `${dateStr} ${timeStr}`;
}