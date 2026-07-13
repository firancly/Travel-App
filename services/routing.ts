export interface Coords {
  latitude: number;
  longitude: number;
}

const OSRM_URL = 'https://router.project-osrm.org/route/v1/driving';
const TIMEOUT_MS = 10_000;

/** Fetches a road-following route through the given stops (in order) via OSRM.
 *  Returns [] for <2 coords, null on failure/timeout (caller falls back to a straight line). */
export async function fetchRoute(coords: Coords[]): Promise<Coords[] | null> {
  if (coords.length < 2) return [];

  const path = coords.map((c) => `${c.longitude},${c.latitude}`).join(';');
  const url = `${OSRM_URL}/${path}?overview=full&geometries=geojson`;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`osrm ${res.status}`);
    const data: any = await res.json();
    const points: [number, number][] = data?.routes?.[0]?.geometry?.coordinates;
    if (!Array.isArray(points) || points.length === 0) throw new Error('no route geometry');

    return points.map(([longitude, latitude]) => ({ latitude, longitude }));
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
