import { dailyPuzzles } from "../puzzles";
import type { PuzzleConfig } from "./types";

export function localDateString(date = new Date()): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function displayDate(dateString: string): string {
  const [year, month, day] = dateString.split("-");
  return `${Number(month)}/${Number(day)}/${year.slice(2)}`;
}

export function getDailyPuzzle(date = new Date()): PuzzleConfig {
  const dateKey = localDateString(date);
  const exact = dailyPuzzles.find((puzzle) => puzzle.date === dateKey);
  if (exact) return exact;

  const firstDate = new Date(`${dailyPuzzles[0].date ?? "2026-06-21"}T00:00:00`);
  const elapsed = Math.max(0, Math.floor((date.getTime() - firstDate.getTime()) / 86_400_000));
  return dailyPuzzles[elapsed % dailyPuzzles.length];
}
