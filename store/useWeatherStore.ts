import { create } from 'zustand';
import { geocodeCity, fetchWeather, type WeatherData } from '@/services/weather';

const STALE_MS = 30 * 60 * 1000; // don't refetch more than every 30 min

interface WeatherState {
  destination: string | null;
  daysCovered: number;
  data: WeatherData | null;
  loading: boolean;
  error: string | null;
  fetchedAt: number | null;

  /** Geocodes + fetches weather for a destination, covering at least `days`.
   *  No-ops if already fresh (same destination, enough day coverage, <30 min old). */
  load: (destination: string, days?: number) => Promise<void>;
}

export const useWeatherStore = create<WeatherState>()((set, get) => ({
  destination: null,
  daysCovered: 0,
  data: null,
  loading: false,
  error: null,
  fetchedAt: null,

  load: async (destination, days = 3) => {
    const s = get();
    const fresh =
      s.destination === destination &&
      s.data &&
      s.daysCovered >= days &&
      s.fetchedAt != null &&
      Date.now() - s.fetchedAt < STALE_MS;
    if (fresh || s.loading) return;

    set({ loading: true, error: null });
    try {
      const { latitude, longitude } = await geocodeCity(destination);
      const data = await fetchWeather(latitude, longitude, days);
      set({ destination, data, daysCovered: days, loading: false, fetchedAt: Date.now() });
    } catch (e: any) {
      set({ loading: false, error: String(e?.message ?? 'weather fetch failed') });
    }
  },
}));