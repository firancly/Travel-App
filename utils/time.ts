/** Add minutes to a "HH:MM" string and return a new "HH:MM" (24h, clamps at 23:59). */
export function addMinutes(time: string, mins: number): string {
  const [h, m] = time.split(':').map((n) => parseInt(n, 10));
  let total = h * 60 + m + mins;
  total = Math.min(total, 23 * 60 + 59);
  const hh = Math.floor(total / 60);
  const mm = total % 60;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

/** 90 -> "1h 30m", 45 -> "45m", 120 -> "2h". */
export function formatDuration(mins: number): string {
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

/** "09:00" -> "9:00 AM" for display. */
export function to12h(time: string): string {
  const [h, m] = time.split(':').map((n) => parseInt(n, 10));
  const period = h >= 12 ? 'PM' : 'AM';
  const hr = h % 12 === 0 ? 12 : h % 12;
  return `${hr}:${String(m).padStart(2, '0')} ${period}`;
}
