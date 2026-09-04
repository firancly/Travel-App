# TourNet — Backend brief

## What the app is

**TourNet** (Navigate the Moment) — a mobile travel planner. **React Native + Expo** app.
Users set trip preferences, an AI generates a day-by-day itinerary (real places + coords),
they view it on a map with a routed path, swap stops, and rain-proof the day using live weather.

## Current architecture (what exists)

- **Mobile app**: Expo (SDK 56), TypeScript, expo-router, Zustand state.
- **State today is LOCAL only** — Zustand + AsyncStorage on-device. No accounts, no cloud.
- **AI itinerary**: a **Cloudflare Worker** (in `server/`) calls Groq (LLM) and returns JSON.
  Runtime = V8 isolate (edge), NOT Node. **Leave this alone** — it stays as-is.
- **Weather**: Open-Meteo, called directly from the app (no key).
- **No database, no auth yet.** ← this is your job.

## Your mission

Build the **persistence + accounts backend** on your stack
(**Bun + Express + oRPC + Prisma + Postgres/Neon**), so the app can:

1. Sign users up / in.
2. Save & load **trips** (multiple per user) and their generated itineraries.
3. (later) bookmarks, bookings.

You own: DB schema, auth, API, hosting. You do **not** touch the RN app UI or the AI Worker.

## Architecture decision (please confirm)

Recommended: **two services, clean split.**

- Your Express/Bun API → auth + trips/itineraries (Neon Postgres).
- The existing Cloudflare Worker → AI generation only.
- Flow: app calls the **Worker** to generate an itinerary, then **POSTs the result to your API** to save it. App reads saved trips from your API.
- (Optional later: your API proxies the Worker so the app has one base URL. Not needed now.)

If you'd rather fold the AI proxy into your Express server, flag it — but the Worker is edge/free and works, so default is leave it.

## Data model (matches the app's TS types — see `types/index.ts`)

```
User        id, email, passwordHash (or auth-provider id), createdAt
Trip        id, userId, destination, startDate, endDate,
            budget ('budget'|'mid'|'luxury'), interests string[], durationDays,
            days JSONB,          // the itinerary — see ItineraryDay below
            source ('mock'|'ai'), createdAt, updatedAt
```

Store the itinerary as a **JSONB `days` column** on Trip (fast MVP, no join complexity).
Shape of `days` (from the app, do not rename fields):

```ts
ItineraryDay  { day: number; label: string; items: ItineraryItem[] }
ItineraryItem { id, time "HH:MM", title, description, durationMin,
                category: 'food'|'culture'|'nature'|'hidden',
                latitude?, longitude?, placeId? }
```

## API the app needs (milestone 1)

Names are illustrative — oRPC procedures or REST, your call. Keep it typed.

- **auth**: `signup(email,password)`, `login(email,password)`, `me()`, `logout()` → returns a session token the app stores (SecureStore/AsyncStorage).
- **trips**: `list()`, `create(tripInput)`, `get(id)`, `update(id, patch)`, `delete(id)`.
  - `create`/`update` accept the whole trip incl `days` JSON.
- That's enough to make the app cloud-backed. Bookmarks/bookings later.

## Constraints (important)

- **Free, no credit card** (project rule): **Neon** free tier is fine. Host the server on a **free/no-card** tier (Fly.io / Render free / Railway) — confirm before building.
- **CORS**: allow the Expo app origin(s); mobile fetch also needs permissive CORS for web/dev.
- **Secrets** server-side only (DB URL, auth secret). Never shipped to the app.
- **Auth**: you mentioned "HC Auth" — use whatever you like **as long as it's free/no-card**. App will store the token and send it as a bearer header.
- Don't break the app's field names/shapes above — they must round-trip unchanged.

## First deliverable (so we can integrate early)

1. Neon DB + Prisma schema (User, Trip) migrated.
2. Auth working (signup/login/me).
3. Trips CRUD deployed to a public URL.
4. Send me: the **base URL** + the **API shape** (oRPC client or endpoint list) so I wire the app to it.

Ship auth + trips CRUD first; everything else builds on it.

## Repo / coordination

- App repo: (GitHub link) — read `types/index.ts` for the exact shapes; `store/usePlanStore.ts` + `store/usePrefsStore.ts` show what state needs to persist.
- Suggest: your backend in its **own repo** (or a monorepo you own) — don't fold the Expo app in yet (avoids churn). Wire via the API.
- Use your Husky/Biome/Turborepo setup freely on the backend.
