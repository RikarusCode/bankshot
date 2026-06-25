import { displayDate } from "./daily";
import type { DailyProgress, PuzzleConfig, StreakState } from "./types";

export function shotSquares(progress: DailyProgress): string {
  if (progress.solved) {
    const totalAttempts = Math.max(1, progress.solvedAttempts ?? progress.attempts ?? progress.shotHistory.length);
    return `${"🟨".repeat(Math.max(0, totalAttempts - 1))}🟩`;
  }
  if (progress.shotHistory.length === 0) return progress.attempts > 0 ? "🟨".repeat(progress.attempts) : "⬜";
  return progress.shotHistory.map((status) => (status === "win" ? "🟩" : "🟨")).join("");
}

export function shareText(puzzle: PuzzleConfig, progress: DailyProgress, streak: StreakState): string {
  const puzzleNumber = puzzle.number ? `#${puzzle.number}` : puzzle.id;
  const date = puzzle.date ? displayDate(puzzle.date) : progress.date;
  return [`Bankshot ${puzzleNumber} - ${date}`, shotSquares(progress), `Streak: ${streak.current}`].join("\n");
}
