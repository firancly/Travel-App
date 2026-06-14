import type { Preferences } from '@/types';

export interface TripInfo {
  /** 0-based index of the day the trip is currently on (clamped to trip length). */
  dayIndex: number;
  /** Friendly status line for the dashboard. */
  statusLabel: string;
  /** Whole days from today until the trip starts (>=0). */
  daysUntilStart: number;
}

const MS_PER_DAY = 1000 * 60 * 60 * 24;

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/**
 * Derive a human dashboard status from the saved preferences.
 * Falls back gracefully when no start date was chosen.
 */
export function getTripInfo(prefs: Preferences, now: Date = new Date()): TripInfo {
  const duration = Math.max(1, prefs.durationDays || 1);

  if (!prefs.startDate) {
    return { dayIndex: 0, statusLabel: `${duration}-day trip`, daysUntilStart: 0 };
  }

  const today = startOfDay(now);
  const start = startOfDay(new Date(prefs.startDate));
  const diffDays = Math.round((today - start) / MS_PER_DAY); // >0 means trip started

  if (diffDays < 0) {
    const until = Math.abs(diffDays);
    return {
      dayIndex: 0,
      statusLabel: until === 1 ? 'Starts tomorrow' : `${until} days to go`,
      daysUntilStart: until,
    };
  }

  if (diffDays >= duration) {
    return { dayIndex: duration - 1, statusLabel: 'Trip complete', daysUntilStart: 0 };
  }

  const dayNumber = diffDays + 1;
  const remaining = duration - dayNumber;
  const tail = remaining === 0 ? 'last day' : `${remaining} ${remaining === 1 ? 'day' : 'days'} left`;
  return {
    dayIndex: diffDays,
    statusLabel: `Day ${dayNumber} of ${duration} - ${tail}`,
    daysUntilStart: 0,
  };
}

/** Just the city part of a "City, Country" destination string. */
export function cityName(destination: string): string {
  return destination.split(',')[0].trim() || destination;
}
