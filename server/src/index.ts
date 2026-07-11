/**
 * TourNet itinerary proxy — Cloudflare Worker (Groq backend).
 *
 * POST /generate-itinerary
 *   body: { destination, durationDays, budget, interests[], startDate? }
 *   -> { days: ItineraryDay[] }   (items include latitude/longitude)
 *
 * POST /swap-item
 *   body: { destination, category, excludeTitles?[], timeSlot? }
 *   -> { item: SwapItem }   (no time/id — client keeps those)
 *
 * Holds the Groq key server-side (never shipped to the app).
 */

export interface Env {
  GROQ_API_KEY: string;
  GROQ_MODEL?: string; // default llama-3.3-70b-versatile
  ALLOW_ORIGIN?: string; // default *
}

type Budget = "budget" | "mid" | "luxury";
type Interest = "culture" | "food" | "adventure" | "relaxation";
type Category = "food" | "culture" | "nature" | "hidden";

interface Prefs {
  destination: string;
  durationDays: number;
  budget: Budget | null;
  interests: Interest[];
  startDate?: string | null;
}

interface GenItem {
  time: string;
  title: string;
  description: string;
  durationMin: number;
  category: Category;
  latitude: number;
  longitude: number;
}
interface GenDay {
  day: number;
  label: string;
  items: GenItem[];
}

interface SwapItem {
  title: string;
  description: string;
  durationMin: number;
  category: Category;
  latitude: number;
  longitude: number;
}
interface SwapReq {
  destination: string;
  category: Category;
  excludeTitles?: string[];
  timeSlot?: string;
  nearLat?: number;
  nearLng?: number;
}

const MODEL_DEFAULT = "llama-3.3-70b-versatile";
const TIMEOUT_MS = 25_000;
const MAX_DAYS = 10;
const CATEGORIES: Category[] = ["food", "culture", "nature", "hidden"];

// ---- Prompt ---------------------------------------------------------------
const SCHEMA_HINT = `Return ONLY a JSON object of this exact shape (no markdown, no commentary):
{"days":[{"day":1,"label":"Day 1 - Area","items":[{"time":"09:00","title":"Place name","description":"One short sentence.","durationMin":75,"category":"culture","latitude":3.1578,"longitude":101.7117}]}]}
category must be one of: food, culture, nature, hidden.`;

function buildPrompt(p: Prefs): { system: string; user: string } {
  const budgetText: Record<Budget, string> = {
    budget:
      "budget-conscious (cheap eats, free/low-cost sights, public transport)",
    mid: "mid-range (comfortable but not extravagant)",
    luxury: "high-end (premium dining and experiences)",
  };

  const system = [
    `You are an expert local travel planner for ${p.destination}.`,
    "You design realistic, well-paced day-by-day itineraries using REAL, well-known places.",
    "Every place must have accurate real-world latitude and longitude.",
    "Group each day geographically so travel between stops is short and sensible.",
    "You always respond with a single valid JSON object and nothing else.",
  ].join(" ");

  const interests = p.interests.length
    ? p.interests.join(", ")
    : "a general mix";
  const budget = p.budget ? budgetText[p.budget] : "mid-range";

  const user = [
    `Plan a ${p.durationDays}-day trip to ${p.destination}.`,
    p.startDate ? `Start date: ${p.startDate}.` : "",
    `Traveler style: ${budget}. Interests: ${interests}.`,
    "",
    "Rules:",
    `- Exactly ${p.durationDays} day objects, day numbers 1..${p.durationDays}.`,
    "- 4 to 5 stops per day, including meal stops where it fits.",
    '- times are "HH:MM" 24h, chronological, starting around 09:00.',
    "- durationMin is a realistic visit length in minutes.",
    "- latitude/longitude are the real coordinates of that place.",
    `- label is a short day title like "Day 1 - <neighbourhood or theme>".`,
    "- description is one short sentence.",
    "",
    SCHEMA_HINT,
  ]
    .filter(Boolean)
    .join("\n");

  return { system, user };
}

function buildSwapPrompt(req: SwapReq): { system: string; user: string } {
  const system = `You are an expert local travel planner for ${req.destination}, responding with one JSON object, using real, well-known places with accurate real-world coordinates.`;

  const exclude = (req.excludeTitles ?? []).join(", ") || "none";
  const slot = req.timeSlot || "any time";
  const hasAnchor = typeof req.nearLat === "number" && typeof req.nearLng === "number";

  const user = [
    `Suggest ONE ${req.category} place in ${req.destination}.`,
    "Must be a real place, with accurate latitude/longitude.",
    `Do NOT repeat any of: ${exclude}.`,
    `Fits a ~${slot} slot.`,
    hasAnchor
      ? `The place MUST be within ~2 km of ${req.nearLat},${req.nearLng} — walkable or a short ride from there.`
      : "",
    'Return JSON: {"item":{"title":"...","description":"...","durationMin":75,"category":"' +
      req.category +
      '","latitude":0,"longitude":0}}',
  ]
    .filter(Boolean)
    .join(" ");

  return { system, user };
}

// ---- Validation -----------------------------------------------------------
function coerce(raw: any, durationDays: number): GenDay[] {
  if (!raw || !Array.isArray(raw.days)) throw new Error("missing days[]");

  const days: GenDay[] = raw.days
    .slice(0, Math.min(durationDays, MAX_DAYS))
    .map((d: any, i: number) => {
      const items: GenItem[] = (Array.isArray(d.items) ? d.items : [])
        .filter(
          (it: any) =>
            it &&
            typeof it.time === "string" &&
            typeof it.title === "string" &&
            typeof it.latitude === "number" &&
            typeof it.longitude === "number",
        )
        .map((it: any) => ({
          time: it.time,
          title: String(it.title),
          description: String(it.description ?? ""),
          durationMin: Number(it.durationMin) || 60,
          category: CATEGORIES.includes(it.category) ? it.category : "hidden",
          latitude: Number(it.latitude),
          longitude: Number(it.longitude),
        }))
        .sort((a: GenItem, b: GenItem) => a.time.localeCompare(b.time));

      return {
        day: i + 1,
        label:
          typeof d.label === "string" && d.label ? d.label : `Day ${i + 1}`,
        items,
      };
    })
    .filter((d: GenDay) => d.items.length > 0);

  if (days.length === 0) throw new Error("no valid days produced");
  return days;
}

function coerceItem(raw: any): SwapItem {
  const it = raw && typeof raw === "object" && raw.item ? raw.item : raw;
  if (!it || typeof it !== "object") throw new Error("missing item");
  if (typeof it.title !== "string" || !it.title) throw new Error("missing title");
  if (typeof it.latitude !== "number" || typeof it.longitude !== "number")
    throw new Error("missing lat/lng");

  return {
    title: it.title,
    description: String(it.description ?? ""),
    durationMin: Number(it.durationMin) || 60,
    category: CATEGORIES.includes(it.category) ? it.category : "hidden",
    latitude: Number(it.latitude),
    longitude: Number(it.longitude),
  };
}

// ---- Groq call ------------------------------------------------------------
async function groqJSON(env: Env, system: string, user: string): Promise<any> {
  const model = env.GROQ_MODEL || MODEL_DEFAULT;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.GROQ_API_KEY}`,
      },
      signal: ctrl.signal,
      body: JSON.stringify({
        model,
        temperature: 0.9,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`groq ${res.status}: ${body.slice(0, 300)}`);
    }

    const data: any = await res.json();
    const text = data?.choices?.[0]?.message?.content;
    if (!text) throw new Error("empty groq response");

    return JSON.parse(text);
  } finally {
    clearTimeout(timer);
  }
}

async function callGroq(env: Env, prefs: Prefs): Promise<GenDay[]> {
  const { system, user } = buildPrompt(prefs);
  const raw = await groqJSON(env, system, user);
  return coerce(raw, prefs.durationDays);
}

async function callGroqSwap(env: Env, req: SwapReq): Promise<SwapItem> {
  const { system, user } = buildSwapPrompt(req);
  const raw = await groqJSON(env, system, user);
  return coerceItem(raw);
}

// ---- HTTP handler ---------------------------------------------------------
function cors(env: Env): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": env.ALLOW_ORIGIN || "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

function json(body: unknown, status: number, env: Env): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...cors(env) },
  });
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    if (req.method === "OPTIONS")
      return new Response(null, { status: 204, headers: cors(env) });

    const url = new URL(req.url);
    if (req.method !== "POST" || (url.pathname !== "/generate-itinerary" && url.pathname !== "/swap-item")) {
      return json({ error: "not_found" }, 404, env);
    }
    if (!env.GROQ_API_KEY)
      return json({ error: "server_misconfigured" }, 500, env);

    if (url.pathname === "/swap-item") {
      let body: SwapReq;
      try {
        body = (await req.json()) as SwapReq;
      } catch {
        return json({ error: "bad_json" }, 400, env);
      }
      if (!body?.destination || !CATEGORIES.includes(body.category)) {
        return json({ error: "destination and category required" }, 400, env);
      }

      try {
        const item = await callGroqSwap(env, body);
        return json({ item }, 200, env);
      } catch (e: any) {
        const aborted = e?.name === "AbortError";
        return json(
          {
            error: aborted ? "timeout" : "swap_failed",
            detail: String(e?.message ?? e),
          },
          502,
          env,
        );
      }
    }

    let prefs: Prefs;
    try {
      prefs = (await req.json()) as Prefs;
    } catch {
      return json({ error: "bad_json" }, 400, env);
    }

    const durationDays = Math.max(
      1,
      Math.min(MAX_DAYS, Number(prefs?.durationDays) || 0),
    );
    if (!prefs?.destination || !durationDays) {
      return json({ error: "destination and durationDays required" }, 400, env);
    }

    try {
      const days = await callGroq(env, { ...prefs, durationDays });
      return json({ days }, 200, env);
    } catch (e: any) {
      const aborted = e?.name === "AbortError";
      return json(
        {
          error: aborted ? "timeout" : "generation_failed",
          detail: String(e?.message ?? e),
        },
        502,
        env,
      );
    }
  },
};
