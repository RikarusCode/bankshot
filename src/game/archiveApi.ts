import type { ArchiveEntry, PuzzleConfig, ServerProgress } from "./types";

type ApiResult<T> = {
  data?: T;
  error?: string;
  status: number;
};

async function readJson<T>(response: Response): Promise<ApiResult<T>> {
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    body = undefined;
  }

  if (!response.ok) {
    const message = body && typeof body === "object" && "error" in body ? String((body as { error?: unknown }).error) : response.statusText;
    return { error: message || "Request failed.", status: response.status };
  }

  return { data: body as T, status: response.status };
}

export async function fetchDailyPuzzle(): Promise<ApiResult<{ date: string; puzzle: PuzzleConfig }>> {
  const response = await fetch("/api/daily", { headers: { Accept: "application/json" } });
  return readJson(response);
}

export async function fetchServerProgress(): Promise<ApiResult<ServerProgress>> {
  const response = await fetch("/api/progress", {
    credentials: "same-origin",
    headers: { Accept: "application/json" }
  });
  return readJson(response);
}

export async function saveServerSolve(input: { date: string; puzzleId: string; puzzleNumber?: number; attempts: number }): Promise<ApiResult<ServerProgress>> {
  const response = await fetch("/api/progress/solve", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(input)
  });
  return readJson(response);
}

export async function fetchArchive(): Promise<ApiResult<{ today: string; entries: ArchiveEntry[] }>> {
  const response = await fetch("/api/archive", { headers: { Accept: "application/json" } });
  return readJson(response);
}

export async function fetchArchivePuzzle(date: string): Promise<ApiResult<{ date: string; puzzle: PuzzleConfig }>> {
  const response = await fetch(`/api/archive/${encodeURIComponent(date)}`, { headers: { Accept: "application/json" } });
  return readJson(response);
}

export async function loginAdmin(password: string): Promise<ApiResult<{ ok: true }>> {
  const response = await fetch("/api/admin/login", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ password })
  });
  return readJson(response);
}

export async function saveArchivePuzzle(date: string, puzzle: PuzzleConfig): Promise<ApiResult<{ ok: true }>> {
  const response = await fetch(`/api/admin/puzzles/${encodeURIComponent(date)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ puzzle })
  });
  return readJson(response);
}

export async function fetchAdminPuzzle(date: string): Promise<ApiResult<{ date: string; puzzle: PuzzleConfig }>> {
  const response = await fetch(`/api/admin/puzzles/${encodeURIComponent(date)}`, { headers: { Accept: "application/json" } });
  return readJson(response);
}

export async function logoutAdmin(): Promise<void> {
  await fetch("/api/admin/logout", { method: "POST" });
}
