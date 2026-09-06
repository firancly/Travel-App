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
  DB: D1Database; // accounts + trips — see schema.sql
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
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

function json(body: unknown, status: number, env: Env): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...cors(env) },
  });
}

async function handleGenerate(req: Request, env: Env): Promise<Response> {
  if (!env.GROQ_API_KEY) return json({ error: "server_misconfigured" }, 500, env);

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
}

async function handleSwap(req: Request, env: Env): Promise<Response> {
  if (!env.GROQ_API_KEY) return json({ error: "server_misconfigured" }, 500, env);

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

// ---- Accounts (D1) ---------------------------------------------------------
// Web Crypto only — Workers have no Node crypto / native bcrypt bindings.

const PBKDF2_ITERATIONS = 100_000;
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function toHex(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}
function fromHex(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.substr(i * 2, 2), 16);
  return out;
}
function randomHex(bytes: number): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return toHex(arr);
}

async function deriveBits(password: string, salt: Uint8Array): Promise<ArrayBuffer> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  return crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: salt as BufferSource, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    key,
    256,
  );
}

async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const bits = await deriveBits(password, salt);
  return `${toHex(salt)}:${toHex(bits)}`;
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [saltHex, hashHex] = stored.split(":");
  if (!saltHex || !hashHex) return false;
  const bits = await deriveBits(password, fromHex(saltHex));
  return toHex(bits) === hashHex;
}

function newId(prefix: string): string {
  return `${prefix}_${randomHex(12)}`;
}

function isEmail(s: unknown): s is string {
  return typeof s === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

interface DbUserRow {
  id: string;
  name: string;
  email: string;
  password_hash: string;
}
interface SessionUser {
  id: string;
  name: string;
  email: string;
}

async function createSession(env: Env, userId: string): Promise<string> {
  const token = randomHex(32);
  const now = Date.now();
  await env.DB.prepare(
    "INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)",
  )
    .bind(token, userId, now, now + SESSION_TTL_MS)
    .run();
  return token;
}

/** Resolves the bearer token on `req` to its session's user, or null. */
async function authenticate(req: Request, env: Env): Promise<SessionUser | null> {
  const auth = req.headers.get("Authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token) return null;
  const row = await env.DB.prepare(
    `SELECT u.id as id, u.name as name, u.email as email FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.token = ? AND s.expires_at > ?`,
  )
    .bind(token, Date.now())
    .first<SessionUser>();
  return row ?? null;
}

async function handleSignup(req: Request, env: Env): Promise<Response> {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ error: "bad_json" }, 400, env);
  }
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  if (!name) return json({ error: "name required" }, 400, env);
  if (!isEmail(email)) return json({ error: "valid email required" }, 400, env);
  if (password.length < 8) return json({ error: "password must be at least 8 characters" }, 400, env);

  const existing = await env.DB.prepare("SELECT id FROM users WHERE email = ?").bind(email).first();
  if (existing) return json({ error: "email_taken" }, 409, env);

  const id = newId("user");
  const passwordHash = await hashPassword(password);
  await env.DB.prepare(
    "INSERT INTO users (id, name, email, password_hash, settings, created_at) VALUES (?, ?, ?, ?, '{}', ?)",
  )
    .bind(id, name, email, passwordHash, Date.now())
    .run();

  const token = await createSession(env, id);
  return json({ token, user: { id, name, email } }, 200, env);
}

async function handleLogin(req: Request, env: Env): Promise<Response> {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ error: "bad_json" }, 400, env);
  }
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  if (!isEmail(email) || !password) return json({ error: "email and password required" }, 400, env);

  const row = await env.DB.prepare(
    "SELECT id, name, email, password_hash FROM users WHERE email = ?",
  )
    .bind(email)
    .first<DbUserRow>();
  if (!row || !(await verifyPassword(password, row.password_hash))) {
    return json({ error: "invalid_credentials" }, 401, env);
  }

  const token = await createSession(env, row.id);
  return json({ token, user: { id: row.id, name: row.name, email: row.email } }, 200, env);
}

async function handleMe(req: Request, env: Env): Promise<Response> {
  const user = await authenticate(req, env);
  if (!user) return json({ error: "unauthorized" }, 401, env);
  return json({ user }, 200, env);
}

async function handleLogout(req: Request, env: Env): Promise<Response> {
  const auth = req.headers.get("Authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (token) await env.DB.prepare("DELETE FROM sessions WHERE token = ?").bind(token).run();
  return json({ ok: true }, 200, env);
}

// ---- Trips CRUD (D1) --------------------------------------------------------

interface DbTripRow {
  id: string;
  user_id: string;
  destination: string;
  start_date: string | null;
  end_date: string | null;
  budget: string | null;
  interests: string;
  duration_days: number;
  days: string;
  source: string;
  created_at: number;
  updated_at: number;
}

function tripFromRow(row: DbTripRow) {
  return {
    id: row.id,
    destination: row.destination,
    startDate: row.start_date,
    endDate: row.end_date,
    budget: row.budget,
    interests: JSON.parse(row.interests),
    durationDays: row.duration_days,
    days: JSON.parse(row.days),
    source: row.source,
    updatedAt: row.updated_at,
  };
}

/** Normalizes + defaults an inbound trip payload (create or update). */
function tripPayload(body: any) {
  return {
    destination: typeof body?.destination === "string" ? body.destination : "",
    startDate: typeof body?.startDate === "string" ? body.startDate : null,
    endDate: typeof body?.endDate === "string" ? body.endDate : null,
    budget: typeof body?.budget === "string" ? body.budget : null,
    interests: Array.isArray(body?.interests) ? body.interests : [],
    durationDays: Number(body?.durationDays) || 1,
    days: Array.isArray(body?.days) ? body.days : [],
    source: body?.source === "ai" ? "ai" : "mock",
  };
}

async function handleListTrips(req: Request, env: Env): Promise<Response> {
  const user = await authenticate(req, env);
  if (!user) return json({ error: "unauthorized" }, 401, env);
  const { results } = await env.DB.prepare(
    "SELECT * FROM trips WHERE user_id = ? ORDER BY updated_at DESC",
  )
    .bind(user.id)
    .all<DbTripRow>();
  return json({ trips: (results ?? []).map(tripFromRow) }, 200, env);
}

async function handleCreateTrip(req: Request, env: Env): Promise<Response> {
  const user = await authenticate(req, env);
  if (!user) return json({ error: "unauthorized" }, 401, env);
  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ error: "bad_json" }, 400, env);
  }
  const t = tripPayload(body);
  if (!t.destination) return json({ error: "destination required" }, 400, env);

  const id = newId("trip");
  const now = Date.now();
  await env.DB.prepare(
    `INSERT INTO trips (id, user_id, destination, start_date, end_date, budget, interests, duration_days, days, source, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      id,
      user.id,
      t.destination,
      t.startDate,
      t.endDate,
      t.budget,
      JSON.stringify(t.interests),
      t.durationDays,
      JSON.stringify(t.days),
      t.source,
      now,
      now,
    )
    .run();

  return json({ trip: { id, ...t, updatedAt: now } }, 200, env);
}

async function handleUpdateTrip(req: Request, env: Env, tripId: string): Promise<Response> {
  const user = await authenticate(req, env);
  if (!user) return json({ error: "unauthorized" }, 401, env);
  const existing = await env.DB.prepare("SELECT user_id FROM trips WHERE id = ?")
    .bind(tripId)
    .first<{ user_id: string }>();
  if (!existing) return json({ error: "not_found" }, 404, env);
  if (existing.user_id !== user.id) return json({ error: "forbidden" }, 403, env);

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ error: "bad_json" }, 400, env);
  }
  const t = tripPayload(body);
  const now = Date.now();
  await env.DB.prepare(
    `UPDATE trips SET destination=?, start_date=?, end_date=?, budget=?, interests=?, duration_days=?, days=?, source=?, updated_at=? WHERE id=?`,
  )
    .bind(
      t.destination,
      t.startDate,
      t.endDate,
      t.budget,
      JSON.stringify(t.interests),
      t.durationDays,
      JSON.stringify(t.days),
      t.source,
      now,
      tripId,
    )
    .run();

  return json({ trip: { id: tripId, ...t, updatedAt: now } }, 200, env);
}

async function handleDeleteTrip(req: Request, env: Env, tripId: string): Promise<Response> {
  const user = await authenticate(req, env);
  if (!user) return json({ error: "unauthorized" }, 401, env);
  const existing = await env.DB.prepare("SELECT user_id FROM trips WHERE id = ?")
    .bind(tripId)
    .first<{ user_id: string }>();
  if (!existing) return json({ error: "not_found" }, 404, env);
  if (existing.user_id !== user.id) return json({ error: "forbidden" }, 403, env);

  await env.DB.prepare("DELETE FROM trips WHERE id = ?").bind(tripId).run();
  return json({ ok: true }, 200, env);
}

// ---- HTTP dispatch ----------------------------------------------------------

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    if (req.method === "OPTIONS")
      return new Response(null, { status: 204, headers: cors(env) });

    const url = new URL(req.url);
    const path = url.pathname;
    const method = req.method;

    try {
      if (path === "/generate-itinerary" && method === "POST") return handleGenerate(req, env);
      if (path === "/swap-item" && method === "POST") return handleSwap(req, env);

      if (path === "/auth/signup" && method === "POST") return handleSignup(req, env);
      if (path === "/auth/login" && method === "POST") return handleLogin(req, env);
      if (path === "/auth/me" && method === "GET") return handleMe(req, env);
      if (path === "/auth/logout" && method === "POST") return handleLogout(req, env);

      if (path === "/trips" && method === "GET") return handleListTrips(req, env);
      if (path === "/trips" && method === "POST") return handleCreateTrip(req, env);
      const tripMatch = path.match(/^\/trips\/([^/]+)$/);
      if (tripMatch && method === "PUT") return handleUpdateTrip(req, env, tripMatch[1]);
      if (tripMatch && method === "DELETE") return handleDeleteTrip(req, env, tripMatch[1]);

      return json({ error: "not_found" }, 404, env);
    } catch (e: any) {
      return json({ error: "internal_error", detail: String(e?.message ?? e) }, 500, env);
    }
  },
};
