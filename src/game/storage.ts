import { localDateString } from "./daily";
import type { DailyProgress, StreakState } from "./types";

const PROGRESS_KEY = "bankshot.dailyProgress.v1";
const STREAK_KEY = "bankshot.streak.v1";

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
