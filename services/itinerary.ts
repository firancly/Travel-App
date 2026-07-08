import type { ItineraryDay, ItineraryItem, Preferences, PlaceCategory } from '@/types';

const API = process.env.EXPO_PUBLIC_ITINERARY_API;
const TIMEOUT_MS = 25_000;
const CATS: PlaceCategory[] = ['food', 'culture', 'nature', 'hidden'];

export interface GeneratePrefs {
  destination: string;
  durationDays: number;
  budget: Preferences['budget'];
  interests: Preferences['interests'];
  startDate?: string | null;
}

let idc = 0;
const genId = () => `ai-${Date.now().toString(36)}-${idc++}`;

/** Whether a proxy URL is configured (else generation is unavailable). */
export const itineraryApiConfigured = (): boolean => !!API;

/** Calls the Worker proxy and returns a validated, app-shaped itinerary. Throws on failure. */
export async function generateItinerary(p: GeneratePrefs): Promise<ItineraryDay[]> {
  if (!API) throw new Error('EXPO_PUBLIC_ITINERARY_API not set');

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${API.replace(/\/$/, '')}/generate-itinerary`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: ctrl.signal,
      body: JSON.stringify({
        destination: p.destination,
        durationDays: p.durationDays,
        budget: p.budget,
        interests: p.interests,
        startDate: p.startDate ?? null,
      }),
    });
    if (!res.ok) throw new Error(`itinerary api ${res.status}`);
    return normalize(await res.json());
  } finally {
    clearTimeout(timer);
  }
}

function normalize(data: any): ItineraryDay[] {
  if (!data || !Array.isArray(data.days)) throw new Error('bad response shape');

  const days: ItineraryDay[] = data.days
    .map((d: any, di: number): ItineraryDay => ({
      day: typeof d.day === 'number' ? d.day : di + 1,
      label: typeof d.label === 'string' && d.label ? d.label : `Day ${di + 1}`,
      items: (Array.isArray(d.items) ? d.items : [])
        .filter((it: any) => it && typeof it.title === 'string' && typeof it.time === 'string')
        .map(
          (it: any): ItineraryItem => ({
            id: genId(),
            time: it.time,
            title: it.title,
            description: String(it.description ?? ''),
            durationMin: Number(it.durationMin) || 60,
            category: CATS.includes(it.category) ? it.category : 'hidden',
            latitude: typeof it.latitude === 'number' ? it.latitude : undefined,
            longitude: typeof it.longitude === 'number' ? it.longitude : undefined,
          }),
        ),
    }))
    .filter((d: ItineraryDay) => d.items.length > 0);

  if (days.length === 0) throw new Error('empty itinerary');
  return days;
}
