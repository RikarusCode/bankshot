import { getCookie, getToday, jsonResponse, loadIndex, loadRecord, type FunctionEnv, type ScheduleEntry } from "./archive";
import type { SolveRecord, StreakState } from "../../src/game/types";

type D1PreparedStatement = {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = unknown>(): Promise<T | null>;
  all<T = unknown>(): Promise<{ results?: T[] }>;
  run(): Promise<unknown>;
};

export type D1Database = {
  prepare(query: string): D1PreparedStatement;
};

export type DeviceEnv = FunctionEnv & {
  BANKSHOT_DB?: D1Database;
  BANKSHOT_DEVICE_SECRET?: string;
};

export type DeviceSession = {
  deviceId: string;
  setCookie?: string;
};

export type ServerProgress = {
  today: string;
  deviceReady: boolean;
  solvedDates: string[];
  solves: SolveRecord[];
  solvedToday: boolean;
  todayAttempts?: number;
  streak: StreakState;
};

export type SolveInput = {
  date: string;
  puzzleId: string;
  puzzleNumber?: number;
  attempts: number;
};

type SolveRow = {
  puzzle_date: string;
  attempts: number;
  solved_at?: string;
};

const DEVICE_COOKIE = "bankshot_device";
const DEVICE_COOKIE_MAX_AGE = 60 * 60 * 24 * 400;

function isValidDateKey(date: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(date);
}

function base64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

async function hmac(secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return base64Url(new Uint8Array(signature));
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let index = 0; index < a.length; index += 1) diff |= a.charCodeAt(index) ^ b.charCodeAt(index);
  return diff === 0;
}

async function signDeviceId(secret: string, deviceId: string): Promise<string> {
  const signature = await hmac(secret, deviceId);
  return `${deviceId}.${signature}`;
}

async function readSignedDeviceId(request: Request, secret: string): Promise<string | undefined> {
  const cookie = getCookie(request, DEVICE_COOKIE);
  if (!cookie) return undefined;

  const [deviceId, signature] = cookie.split(".");
  if (!deviceId || !signature) return undefined;

  const expected = await hmac(secret, deviceId);
  return timingSafeEqual(signature, expected) ? deviceId : undefined;
}

function createDeviceCookie(value: string, request: Request): string {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return `${DEVICE_COOKIE}=${value}; Max-Age=${DEVICE_COOKIE_MAX_AGE}; Path=/; HttpOnly${secure}; SameSite=Lax`;
}

function requireDeviceBindings(env: DeviceEnv): Response | undefined {
  if (!env.BANKSHOT_DB) return jsonResponse({ error: "BANKSHOT_DB is not configured." }, { status: 500 });
  if (!env.BANKSHOT_DEVICE_SECRET) return jsonResponse({ error: "BANKSHOT_DEVICE_SECRET is not configured." }, { status: 500 });
  return undefined;
}

export async function getOrCreateDevice(request: Request, env: DeviceEnv): Promise<DeviceSession | Response> {
  const bindingError = requireDeviceBindings(env);
  if (bindingError) return bindingError;

  const secret = env.BANKSHOT_DEVICE_SECRET as string;
  const now = new Date().toISOString();
  let deviceId = await readSignedDeviceId(request, secret);
  let setCookie: string | undefined;

  if (!deviceId) {
    deviceId = crypto.randomUUID();
    setCookie = createDeviceCookie(await signDeviceId(secret, deviceId), request);
  }

  await env.BANKSHOT_DB?.prepare(
    `INSERT INTO devices (id, created_at, last_seen_at)
     VALUES (?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET last_seen_at = excluded.last_seen_at`
  )
    .bind(deviceId, now, now)
    .run();

  return { deviceId, setCookie };
}

export function withDeviceCookie(response: Response, session: DeviceSession): Response {
  if (!session.setCookie) return response;
  response.headers.append("Set-Cookie", session.setCookie);
  return response;
}

async function loadSolveRows(env: DeviceEnv, deviceId: string): Promise<SolveRow[]> {
  const result = await env.BANKSHOT_DB?.prepare("SELECT puzzle_date, attempts, solved_at FROM daily_solves WHERE device_id = ? ORDER BY puzzle_date ASC").bind(deviceId).all<SolveRow>();
  return result?.results ?? [];
}

export async function loadSolvedDates(env: DeviceEnv, deviceId: string): Promise<string[]> {
  const rows = await loadSolveRows(env, deviceId);
  return rows.map((row) => row.puzzle_date);
}

export async function recordSolve(env: DeviceEnv, deviceId: string, input: SolveInput): Promise<Response | undefined> {
  if (!isValidDateKey(input.date)) return jsonResponse({ error: "Puzzle date must be YYYY-MM-DD." }, { status: 400 });
  if (!Number.isInteger(input.attempts) || input.attempts < 1) return jsonResponse({ error: "Attempts must be a positive integer." }, { status: 400 });

  const today = getToday(env);
  if (input.date > today) return jsonResponse({ error: "Future puzzles cannot be solved yet." }, { status: 403 });

  const record = await loadRecord(env, input.date);
  if (!record) return jsonResponse({ error: "Puzzle not found." }, { status: 404 });
  if (record.puzzle.id !== input.puzzleId) return jsonResponse({ error: "Puzzle id does not match the scheduled puzzle." }, { status: 400 });

  const solvedAt = new Date().toISOString();
  await env.BANKSHOT_DB?.prepare(
    `INSERT INTO daily_solves (device_id, puzzle_date, puzzle_id, puzzle_number, attempts, solved_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(device_id, puzzle_date) DO UPDATE SET
       puzzle_id = excluded.puzzle_id,
       puzzle_number = excluded.puzzle_number,
       attempts = CASE
         WHEN excluded.attempts < daily_solves.attempts THEN excluded.attempts
         ELSE daily_solves.attempts
       END`
  )
    .bind(deviceId, input.date, input.puzzleId, input.puzzleNumber ?? record.number, input.attempts, solvedAt)
    .run();

  return undefined;
}

export function computeScheduledStreak(index: ScheduleEntry[], solvedDates: string[], today: string): StreakState {
  const solved = new Set(solvedDates.filter((date) => date <= today));
  const eligibleDates = index
    .map((entry) => entry.date)
    .filter((date) => date <= today)
    .sort((a, b) => a.localeCompare(b));
  const lastSolvedDate = [...solved].sort((a, b) => a.localeCompare(b)).at(-1);

  let current = 0;
  for (let indexOffset = eligibleDates.length - 1; indexOffset >= 0; indexOffset -= 1) {
    const date = eligibleDates[indexOffset];
    if (date === today && !solved.has(date)) continue;
    if (!solved.has(date)) break;
    current += 1;
  }

  return lastSolvedDate ? { current, lastSolvedDate } : { current: 0 };
}

export async function buildServerProgress(env: DeviceEnv, deviceId: string): Promise<ServerProgress> {
  const today = getToday(env);
  const [index, solveRows] = await Promise.all([loadIndex(env), loadSolveRows(env, deviceId)]);
  const solvedDates = solveRows.map((row) => row.puzzle_date);
  const todaySolve = solveRows.find((row) => row.puzzle_date === today);
  const solves = solveRows.map((row) => ({
    date: row.puzzle_date,
    attempts: row.attempts,
    solvedOnDate: row.solved_at ? getToday(env, new Date(row.solved_at)) === row.puzzle_date : false
  }));
  return {
    today,
    deviceReady: true,
    solvedDates,
    solves,
    solvedToday: solvedDates.includes(today),
    todayAttempts: todaySolve?.attempts,
    streak: computeScheduledStreak(index, solvedDates, today)
  };
}
