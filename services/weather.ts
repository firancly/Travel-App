export type WeatherCondition = 'sunny' | 'clouds' | 'rain' | 'thunder';

export interface HourlyPoint {
  time: string; // ISO
  precipProb: number; // %
  code: number; // WMO code
}

export interface WeatherData {
  current: { tempC: number; code: number; condition: WeatherCondition };
  todayRainChance: number; // %
  hourly: HourlyPoint[];
}

const GEOCODE_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
const TIMEOUT_MS = 10_000;

/** Maps a WMO weather_code to our condition set. */
export function codeToCondition(code: number): WeatherCondition {
  if (code === 0) return 'sunny';
  if (code >= 1 && code <= 3) return 'clouds';
  if (code === 45 || code === 48) return 'clouds';
  if (code >= 95) return 'thunder';
  return 'rain'; // drizzle/rain/showers/snow (45-99 minus the above)
}

async function fetchJSON(url: string): Promise<any> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`weather api ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

const geocodeCache = new Map<string, { latitude: number; longitude: number }>();

/** Resolves a city/destination string to coordinates. Cached per name (city rarely changes). */
export async function geocodeCity(name: string): Promise<{ latitude: number; longitude: number }> {
  const key = name.trim().toLowerCase();
  const cached = geocodeCache.get(key);
  if (cached) return cached;

  const city = name.split(',')[0].trim();
  const url = `${GEOCODE_URL}?name=${encodeURIComponent(city)}&count=1`;
  const data = await fetchJSON(url);
  const r = data?.results?.[0];
  if (!r || typeof r.latitude !== 'number' || typeof r.longitude !== 'number') {
    throw new Error(`no geocode result for "${name}"`);
  }
  const coords = { latitude: r.latitude, longitude: r.longitude };
  geocodeCache.set(key, coords);
  return coords;
}

const MAX_FORECAST_DAYS = 16; // Open-Meteo's free-tier hourly ceiling

/** Fetches current + hourly + today's rain chance for a coordinate.
 *  `days` should cover the trip length so later days aren't left un-forecast. */
export async function fetchWeather(
  latitude: number,
  longitude: number,
  days: number = 3,
): Promise<WeatherData> {
  const forecastDays = Math.min(MAX_FORECAST_DAYS, Math.max(3, days));
  const url =
    `${FORECAST_URL}?latitude=${latitude}&longitude=${longitude}` +
    `&current=temperature_2m,weather_code,precipitation` +
    `&hourly=precipitation_probability,weather_code,temperature_2m` +
    `&daily=weather_code,temperature_2m_max,precipitation_probability_max` +
    `&timezone=auto&forecast_days=${forecastDays}`;
  const data = await fetchJSON(url);

  const current = data?.current;
  if (!current || typeof current.temperature_2m !== 'number' || typeof current.weather_code !== 'number') {
    throw new Error('bad weather response shape');
  }

  const hourlyTimes: string[] = Array.isArray(data?.hourly?.time) ? data.hourly.time : [];
  const hourlyProb: number[] = Array.isArray(data?.hourly?.precipitation_probability)
    ? data.hourly.precipitation_probability
    : [];
  const hourlyCode: number[] = Array.isArray(data?.hourly?.weather_code) ? data.hourly.weather_code : [];

  const hourly: HourlyPoint[] = hourlyTimes.map((time, i) => ({
    time,
    precipProb: Number(hourlyProb[i]) || 0,
    code: Number(hourlyCode[i]) || 0,
  }));

  const todayRainChance = Number(data?.daily?.precipitation_probability_max?.[0]) || 0;

  return {
    current: {
      tempC: current.temperature_2m,
      code: current.weather_code,
      condition: codeToCondition(current.weather_code),
    },
    todayRainChance,
    hourly,
  };
}
