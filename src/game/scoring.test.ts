import { describe, expect, it } from "vitest";
import { shareText, shotSquares } from "./scoring";
import type { DailyProgress, PuzzleConfig } from "./types";

const progress: DailyProgress = {
  puzzleId: "daily-1",
  date: "2026-06-24",
  attempts: 3,
  solved: true,
  solvedAttempts: 3,
  shotHistory: ["win"]
};

const puzzle: PuzzleConfig = {
  schemaVersion: 1,
  id: "daily-1",
  number: 1,
  date: "2026-06-24",
  size: 8,
  start: { row: 7, col: 1 },
  launchDirection: "N",
  pocket: { row: -1, col: 6 },
  inventory: [],
  fixedPieces: []
};

describe("share scoring", () => {
  it("uses solvedAttempts when shot history is shorter than the attempt count", () => {
    expect(shotSquares(progress)).toBe("🟨🟨🟩");
    expect(shareText(puzzle, progress, { current: 1 })).toContain("🟨🟨🟩");
  });
});
