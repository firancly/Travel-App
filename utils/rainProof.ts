import type { ItineraryItem } from '@/types';
import type { HourlyPoint } from '@/services/weather';
import { codeToCondition } from '@/services/weather';
import { addDaysToISO } from '@/utils/date';

const WET_THRESHOLD = 60;

/** Outdoor-leaning categories that suffer most from rain. */
export function isWeatherSensitive(item: ItineraryItem): boolean {
  return item.category === 'nature' || item.category === 'hidden';
}

function hourOf(time: string): number {
  return Number(time.split(':')[0]);
}

/** Maps a trip day number (1-based) to the "YYYY-MM-DD" it falls on. */
export function dateForDay(startDate: string, dayNumber: number): string {
  return addDaysToISO(startDate, dayNumber - 1).slice(0, 10);
}

/** Hours (0-23) on `dateStr` where rain is likely, per the hourly forecast.
 *  Returns null when the date isn't covered by the forecast (feature disabled for that day). */
export function wetHoursForDate(
  hourly: HourlyPoint[],
  dateStr: string,
  threshold: number = WET_THRESHOLD,
): Set<number> | null {
  const dayHours = hourly.filter((h) => h.time.startsWith(dateStr));
  if (dayHours.length === 0) return null;

  const wet = new Set<number>();
  for (const h of dayHours) {
    const hour = Number(h.time.slice(11, 13));
    const condition = codeToCondition(h.code);
    if (h.precipProb > threshold || condition === 'rain' || condition === 'thunder') {
      wet.add(hour);
    }
  }
  return wet;
}

/** Greedily swaps time slots between weather-sensitive stops sitting in wet hours
 *  and weather-safe stops sitting in dry hours, then re-sorts by time.
 *  Returns null when there's nothing worth moving. */
export function rainProofReorder(
  items: ItineraryItem[],
  wetHours: Set<number>,
): ItineraryItem[] | null {
  const wet = (time: string) => wetHours.has(hourOf(time));

  const sensitiveWet = items
    .filter((i) => isWeatherSensitive(i) && wet(i.time))
    .sort((a, b) => a.time.localeCompare(b.time));
  const safeDry = items
    .filter((i) => !isWeatherSensitive(i) && !wet(i.time))
    .sort((a, b) => a.time.localeCompare(b.time));

  const pairCount = Math.min(sensitiveWet.length, safeDry.length);
  if (pairCount === 0) return null;

  const newTimeById = new Map<string, string>();
  for (let k = 0; k < pairCount; k++) {
    const a = sensitiveWet[k];
    const b = safeDry[k];
    newTimeById.set(a.id, b.time);
    newTimeById.set(b.id, a.time);
  }

  return items
    .map((i) => (newTimeById.has(i.id) ? { ...i, time: newTimeById.get(i.id)! } : i))
    .sort((a, b) => a.time.localeCompare(b.time));
}
