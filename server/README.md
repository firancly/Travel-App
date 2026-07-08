# TourNet itinerary proxy (Cloudflare Worker)

Holds the Groq API key server-side and turns trip preferences into a JSON itinerary.
The app never sees the key. (Groq = free, no credit card; OpenAI-compatible JSON mode.)

`POST /generate-itinerary`
```json
// request
{ "destination": "Kuala Lumpur, Malaysia", "durationDays": 3,
  "budget": "mid", "interests": ["food","culture"], "startDate": "2026-06-15" }

// response
{ "days": [ { "day": 1, "label": "Day 1 - ...",
  "items": [ { "time":"09:00","title":"...","description":"...",
    "durationMin":75,"category":"culture","latitude":3.15,"longitude":101.71 } ] } ] }
```

## Deploy (free, no credit card)

1. **Get a Groq key** — https://console.groq.com → *API Keys* → Create. Free, no card. Starts with `gsk_`.
2. Install + log in:
   ```bash
   cd server
   npm install
   npx wrangler login
   ```
3. **Store the key as a secret** (not in any file):
   ```bash
   npx wrangler secret put GROQ_API_KEY
   # paste the gsk_... key when prompted (name only — don't append the key to the command)
   ```
4. Deploy:
   ```bash
   npm run deploy
   ```
   Copy the printed URL, e.g. `https://tournet-itinerary.<you>.workers.dev`.
5. Put that URL in the app's `.env`:
   ```
   EXPO_PUBLIC_ITINERARY_API=https://tournet-itinerary.<you>.workers.dev
   ```

## Test
```bash
curl -X POST https://tournet-itinerary.<you>.workers.dev/generate-itinerary \
  -H "Content-Type: application/json" \
  -d '{"destination":"Kuala Lumpur, Malaysia","durationDays":3,"budget":"mid","interests":["food","culture"]}'
```

## Local dev
```bash
cp .dev.vars.example .dev.vars   # put your gsk_ key in .dev.vars (gitignored)
npm run dev                      # http://localhost:8787/generate-itinerary
```

Model/CORS overrides live in `wrangler.toml` (`GROQ_MODEL`, `ALLOW_ORIGIN`).
