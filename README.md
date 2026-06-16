# Navigate the Moment (TourNet)

A mobile-first travel companion MVP built with **React Native + Expo + TypeScript**.
Plan a trip, discover places on a map, build a day-by-day itinerary with smart swaps,
listen to self-guided audio tours, and manage bookings — all on local mock data.

> Demo content is themed around **Kuala Lumpur, Malaysia**.

---

## Run it

Dependencies are already installed. From the project root:

```bash
npx expo start
```

Then:
- Press **a** to open the Android emulator, **i** for the iOS simulator, or
- Scan the QR code with the **Expo Go** app on your phone.

Everything runs in **Expo Go** — no native build or API keys required for development.

---

## Tech stack

| Concern | Choice |
| --- | --- |
| Framework | Expo SDK 56 (React Native 0.85, React 19) |
| Language | TypeScript (strict) |
| Navigation | React Navigation — native stack + bottom tabs |
| State | Zustand + `persist` middleware |
| Persistence | AsyncStorage (onboarding answers + itinerary) |
| Maps | `react-native-maps` (Apple Maps on iOS, Google on Android) |
| Bottom sheets | `@gorhom/bottom-sheet` |
| Drag & reorder | `react-native-draggable-flatlist` |
| Animations | `react-native-reanimated` v4 |
| Icons | `lucide-react-native` (exclusively) |
| Fonts | Plus Jakarta Sans (headings) + Inter (body) via `@expo-google-fonts/*` |

---

## Project structure

```
.
├── App.tsx                # Providers, font loading, splash gate
├── index.ts               # Expo entry
├── mock/                  # All mock JSON data + typed accessors
│   ├── places.json
│   ├── itinerary.json
│   ├── swaps.json         # Smart-swap alternatives pool
│   ├── audioTours.json
│   ├── bookings.json
│   ├── weather.json
│   └── index.ts
├── components/            # Reusable UI (Button, Card, Skeleton, etc.)
├── screens/               # One file per screen
├── navigation/            # Root stack + bottom tabs + custom tab bar
├── store/                 # Zustand stores (prefs, plan)
├── theme/                 # Colors, spacing, typography, shadows, map style
├── utils/                 # date / time / trip / category helpers
├── hooks/                 # useFakeLoading (skeleton demo)
└── types/                 # Shared domain types
```

## Screens

1. **Onboarding** — 3-step setup (travel-style quiz → destination + date → review). Answers persist to AsyncStorage.
2. **Home / Dashboard** — greeting + days-remaining, weather-aware rain banner with a Smart-Swap CTA, today's itinerary snapshot, quick actions.
3. **Discover** — map with custom green pins + filter chips; tapping a pin opens a bottom sheet with details and **Add to Plan**.
4. **My Plan** — day-by-day timeline, **drag-to-reorder** (hold the grip), and **Smart Swap** (old card slides out left, replacement slides in from the right).
5. **Audio Tours + Player** — tour list and a player with play/pause, a simulated progress bar, stop tracking, and a route map (polyline + stop pins).
6. **Bookings** — Restaurants / Activities / Transport tabs, status badges, and a **Book Now** modal form (name, date, party size).
7. **Profile** — trip summary, stats, edit preferences (re-opens onboarding), and reset.

Bottom navigation has 4 tabs (Home, Discover, My Plan, Profile) with the active
icon spring-scaling to 1.1×.

---

## Notes & deviations

- **Skeleton loaders:** The spec named `react-native-skeleton-placeholder`, which depends on
  `react-native-linear-gradient` and does **not** run in Expo Go. To keep the app runnable
  with `npx expo start`, skeletons are implemented with an equivalent shimmer built on
  `expo-linear-gradient` + Reanimated (`components/Skeleton.tsx`). Same effect, Expo-Go safe.
- **Maps:** On SDK 55+, Expo Go can no longer authenticate Google Maps on Android (blank map).
  Google Maps now requires your own API key in `app.json` (`react-native-maps` config plugin,
  `androidGoogleMapsApiKey`) **and a development build** (`npx expo run:android` or an EAS dev
  build) — Expo Go won't pick up the plugin. iOS uses Apple Maps and works without a key.
  A free, no-billing alternative is MapLibre + OpenStreetMap tiles.
- **No WhatsApp integration**, as requested.
- All data is mock JSON in `/mock`; "Add to Plan", "Smart Swap", reorder, and new bookings
  mutate in-memory state (the itinerary is also persisted).
