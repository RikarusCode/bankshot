import { parsePuzzleJson } from "../../src/game/puzzleExport";
import type { ArchiveEntry, PuzzleConfig } from "../../src/game/types";

type KvNamespace = {
  get(key: string): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
};

export type FunctionEnv = {
  PUZZLES_KV: KvNamespace;
  BANKSHOT_ADMIN_PASSWORD?: string;
  BANKSHOT_ADMIN_SESSION_SECRET?: string;
  BANKSHOT_TIME_ZONE?: string;
};

export type ScheduleEntry = {
  date: string;
  number: number;
};

export type ScheduledPuzzleRecord = ScheduleEntry & {
  puzzle: PuzzleConfig;
  updatedAt: string;
};

const INDEX_KEY = "puzzle:index";
const SESSION_COOKIE = "bankshot_admin";
const SESSION_TTL_SECONDS = 2 * 60 * 60;

export function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...init.headers
    }
  });
}

export function getToday(env: FunctionEnv, date = new Date()): string {
  const timeZone = env.BANKSHOT_TIME_ZONE || "America/Los_Angeles";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

function puzzleKey(date: string): string {
  return `puzzle:${date}`;
}

function isValidDateKey(date: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(date);
}

export async function loadIndex(env: FunctionEnv): Promise<ScheduleEntry[]> {
  const raw = await env.PUZZLES_KV.get(INDEX_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as ScheduleEntry[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((entry) => isValidDateKey(entry.date) && Number.isInteger(entry.number)).sort((a, b) => a.date.localeCompare(b.date));
  } catch {
    return [];
  }
}

export async function saveIndex(env: FunctionEnv, entries: ScheduleEntry[]): Promise<void> {
  const normalized = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  await env.PUZZLES_KV.put(INDEX_KEY, JSON.stringify(normalized));
}

export async function loadRecord(env: FunctionEnv, date: string): Promise<ScheduledPuzzleRecord | undefined> {
  const raw = await env.PUZZLES_KV.get(puzzleKey(date));
  if (!raw) return undefined;
  try {
    return JSON.parse(raw) as ScheduledPuzzleRecord;
  } catch {
    return undefined;
  }
}

export async function saveRecord(env: FunctionEnv, date: string, puzzle: PuzzleConfig): Promise<void> {
  const errors = validateScheduledPuzzle(date, puzzle);
  if (errors.length > 0) throw new Error(errors.join(" "));

  const index = await loadIndex(env);
  const existing = index.find((entry) => entry.date === date);
  const nextNumber = puzzle.number ?? existing?.number ?? Math.max(0, ...index.map((entry) => entry.number)) + 1;
  const puzzleWithSchedule = { ...puzzle, date, number: nextNumber };
  const record: ScheduledPuzzleRecord = {
    date,
    number: nextNumber,
    puzzle: puzzleWithSchedule,
    updatedAt: new Date().toISOString()
  };

  await env.PUZZLES_KV.put(puzzleKey(date), JSON.stringify(record));
  await saveIndex(env, [...index.filter((entry) => entry.date !== date), { date, number: nextNumber }]);
}

export async function deleteRecord(env: FunctionEnv, date: string): Promise<void> {
  if (!isValidDateKey(date)) throw new Error("Archive date must be YYYY-MM-DD.");
  const index = await loadIndex(env);
  await env.PUZZLES_KV.delete(puzzleKey(date));
  await saveIndex(env, index.filter((entry) => entry.date !== date));
}

export async function publicArchive(env: FunctionEnv, date = new Date()): Promise<{ today: string; entries: ArchiveEntry[] }> {
  const today = getToday(env, date);
  const index = await loadIndex(env);
  const entries = await Promise.all(
    index.map(async (entry): Promise<ArchiveEntry> => {
      if (entry.date > today) return { ...entry, status: "locked" };

      const record = await loadRecord(env, entry.date);
      if (!record) return { ...entry, status: "missing" };
      return {
        date: entry.date,
        number: record.number,
        status: "available",
        title: record.puzzle.title,
        puzzle: record.puzzle
      };
    })
  );

  return { today, entries };
}

export function validateScheduledPuzzle(date: string, puzzle: PuzzleConfig): string[] {
  if (!isValidDateKey(date)) return ["Archive date must be YYYY-MM-DD."];
  const parsed = parsePuzzleJson(JSON.stringify(puzzle));
  const errors = [...parsed.errors];
  if (parsed.puzzle?.date && parsed.puzzle.date !== date) errors.push("Puzzle date must match the archive date.");
  return errors;
}

export function getCookie(request: Request, name: string): string | undefined {
  const cookie = request.headers.get("Cookie") ?? "";
  return cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}

async function hmac(secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return base64Url(new Uint8Array(signature));
}

function base64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function encodePayload(value: unknown): string {
  return btoa(JSON.stringify(value)).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function decodePayload(value: string): unknown {
  const padded = value.replaceAll("-", "+").replaceAll("_", "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  return JSON.parse(atob(padded));
}

export async function createSessionCookie(env: FunctionEnv): Promise<string> {
  const secret = env.BANKSHOT_ADMIN_SESSION_SECRET;
  if (!secret) throw new Error("BANKSHOT_ADMIN_SESSION_SECRET is not configured.");
  const expires = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const payload = encodePayload({ expires });
  const signature = await hmac(secret, payload);
  return `${SESSION_COOKIE}=${payload}.${signature}; Max-Age=${SESSION_TTL_SECONDS}; Path=/; HttpOnly; Secure; SameSite=Strict`;
}

export function clearSessionCookie(): string {
  return `${SESSION_COOKIE}=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Strict`;
}

export async function requireAdmin(request: Request, env: FunctionEnv): Promise<Response | undefined> {
  const secret = env.BANKSHOT_ADMIN_SESSION_SECRET;
  if (!secret) return jsonResponse({ error: "Admin session secret is not configured." }, { status: 500 });

  const cookie = getCookie(request, SESSION_COOKIE);
  if (!cookie) return jsonResponse({ error: "Admin login required." }, { status: 401 });

  const [payload, signature] = cookie.split(".");
  if (!payload || !signature) return jsonResponse({ error: "Admin login required." }, { status: 401 });
  const expected = await hmac(secret, payload);
  if (signature !== expected) return jsonResponse({ error: "Admin login required." }, { status: 401 });

  try {
    const decoded = decodePayload(payload) as { expires?: unknown };
    if (typeof decoded.expires !== "number" || decoded.expires < Math.floor(Date.now() / 1000)) {
      return jsonResponse({ error: "Admin login expired." }, { status: 401 });
    }
  } catch {
    return jsonResponse({ error: "Admin login required." }, { status: 401 });
  }

  return undefined;
}
