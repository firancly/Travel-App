import { create } from 'zustand';
import { geocodeCity, fetchWeather, type WeatherData } from '@/services/weather';

const STALE_MS = 30 * 60 * 1000; // don't refetch more than every 30 min

interface WeatherState {
  destination: string | null;
  data: WeatherData | null;
  loading: boolean;
  error: string | null;
  fetchedAt: number | null;

  /** Geocodes + fetches weather for a destination. No-ops if already fresh for that destination. */
  load: (destination: string) => Promise<void>;
}

export const useWeatherStore = create<WeatherState>()((set, get) => ({
  destination: null,
  data: null,
  loading: false,
  error: null,
  fetchedAt: null,

  load: async (destination) => {
    const s = get();
    const fresh =
      s.destination === destination &&
      s.data &&
      s.fetchedAt != null &&
      Date.now() - s.fetchedAt < STALE_MS;
    if (fresh || s.loading) return;

    set({ loading: true, error: null });
    try {
      const { latitude, longitude } = await geocodeCity(destination);
      const data = await fetchWeather(latitude, longitude);
      set({ destination, data, loading: false, fetchedAt: Date.now() });
    } catch (e: any) {
      set({ loading: false, error: String(e?.message ?? 'weather fetch failed') });
    }
  },
}));