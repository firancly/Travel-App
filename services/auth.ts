import type { Trip } from '@/types';

const API = process.env.EXPO_PUBLIC_ITINERARY_API;
const TIMEOUT_MS = 15_000;

export interface AuthUser {
  id: string;
  name: string;
  email: string;
}

export const authApiConfigured = (): boolean => !!API;

async function request<T>(
  path: string,
  opts: { method?: string; token?: string | null; body?: unknown } = {},
): Promise<T> {
  if (!API) throw new Error('EXPO_PUBLIC_ITINERARY_API not set');

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${API.replace(/\/$/, '')}${path}`, {
      method: opts.method ?? 'GET',
      signal: ctrl.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}),
      },
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    });
    const data: any = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error ?? `request failed (${res.status})`);
    return data as T;
  } finally {
    clearTimeout(timer);
  }
}

export function signup(name: string, email: string, password: string) {
  return request<{ token: string; user: AuthUser }>('/auth/signup', {
    method: 'POST',
    body: { name, email, password },
  });
}

export function login(email: string, password: string) {
  return request<{ token: string; user: AuthUser }>('/auth/login', {
    method: 'POST',
    body: { email, password },
  });
}

export function me(token: string) {
  return request<{ user: AuthUser }>('/auth/me', { token });
}

export function logout(token: string) {
  return request<{ ok: true }>('/auth/logout', { method: 'POST', token });
}

// ---- Trips ------------------------------------------------------------

/** Trip shape the server accepts/returns — same fields as the client's
 *  `Trip` type minus `id`/`updatedAt` for the create payload. */
export type RemoteTrip = Trip;

export function fetchTrips(token: string) {
  return request<{ trips: RemoteTrip[] }>('/trips', { token });
}

export function createTrip(token: string, trip: Omit<Trip, 'id' | 'updatedAt'>) {
  return request<{ trip: RemoteTrip }>('/trips', { method: 'POST', token, body: trip });
}

export function updateTrip(token: string, id: string, trip: Omit<Trip, 'id' | 'updatedAt'>) {
  return request<{ trip: RemoteTrip }>(`/trips/${id}`, { method: 'PUT', token, body: trip });
}

export function deleteTrip(token: string, id: string) {
  return request<{ ok: true }>(`/trips/${id}`, { method: 'DELETE', token });
}
