/** Add N days to an ISO date string, returning a new ISO string. */
export function addDaysToISO(iso: string, days: number): string {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/** "2026-06-15..." -> "Mon, Jun 15". */
export function formatDateLabel(iso: string | null): string {
  if (!iso) return 'Pick a date';
  const d = new Date(iso);
  return `${WEEKDAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

/** "2026-06-15..." -> "Jun 15". */
export function formatShortDate(iso: string | null): string {
  if (!iso) return '--';
  const d = new Date(iso);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

/** Range label e.g. "Jun 15 - Jun 17". */
export function formatDateRange(start: string | null, end: string | null): string {
  if (!start) return 'Dates not set';
  if (!end) return formatShortDate(start);
  return `${formatShortDate(start)} - ${formatShortDate(end)}`;
}
