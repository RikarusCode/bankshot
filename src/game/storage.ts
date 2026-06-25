import { localDateString } from "./daily";
import type { DailyProgress, SolveRecord, StreakState } from "./types";

const PROGRESS_KEY = "bankshot.dailyProgress.v1";
const STREAK_KEY = "bankshot.streak.v1";
const SOLVE_HISTORY_KEY = "bankshot.solveHistory.v1";

export function loadDailyProgress(puzzleId: string, date = localDateString()): DailyProgress {
  const raw = localStorage.getItem(PROGRESS_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as DailyProgress;
      if (parsed.puzzleId === puzzleId && parsed.date === date) return parsed;
    } catch {
      localStorage.removeItem(PROGRESS_KEY);
    }
  }

  return {
    puzzleId,
    date,
    attempts: 0,
    solved: false,
    shotHistory: []
  };
}

export function saveDailyProgress(progress: DailyProgress): void {
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
}

export function loadStreak(): StreakState {
  const raw = localStorage.getItem(STREAK_KEY);
  if (!raw) return { current: 0 };
  try {
    return JSON.parse(raw) as StreakState;
  } catch {
    localStorage.removeItem(STREAK_KEY);
    return { current: 0 };
  }
}

export function saveStreak(streak: StreakState): void {
  localStorage.setItem(STREAK_KEY, JSON.stringify(streak));
}

export function updateStreakOnSolve(date: string): StreakState {
  const streak = loadStreak();
  if (streak.lastSolvedDate === date) return streak;

  const yesterday = new Date(`${date}T00:00:00`);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = localDateString(yesterday);
  const next = {
    current: streak.lastSolvedDate === yesterdayKey ? streak.current + 1 : 1,
    lastSolvedDate: date
  };
  saveStreak(next);
  return next;
}

export function loadSolveHistory(): SolveRecord[] {
  const raw = localStorage.getItem(SOLVE_HISTORY_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as SolveRecord[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((record) => typeof record.date === "string" && Number.isInteger(record.attempts) && typeof record.solvedOnDate === "boolean");
  } catch {
    localStorage.removeItem(SOLVE_HISTORY_KEY);
    return [];
  }
}

export function saveSolveHistory(records: SolveRecord[]): void {
  const normalized = [...records].sort((a, b) => a.date.localeCompare(b.date));
  localStorage.setItem(SOLVE_HISTORY_KEY, JSON.stringify(normalized));
}

export function recordLocalSolve(input: SolveRecord): SolveRecord[] {
  const current = loadSolveHistory();
  const existing = current.find((record) => record.date === input.date);
  const nextRecord = existing
    ? {
        date: input.date,
        attempts: Math.min(existing.attempts, input.attempts),
        solvedOnDate: existing.solvedOnDate || input.solvedOnDate
      }
    : input;
  const next = [...current.filter((record) => record.date !== input.date), nextRecord];
  saveSolveHistory(next);
  return next;
}
