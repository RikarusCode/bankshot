import { describe, expect, it } from "vitest";
import { parsePuzzleJson, serializePuzzle } from "./puzzleExport";
import { validatePuzzle } from "./puzzleValidation";
import type { PuzzleConfig } from "./types";

describe("puzzle validation", () => {
  const puzzle: PuzzleConfig = {
    schemaVersion: 1,
    id: "valid",
    size: 7,
    start: { row: 6, col: 1 },
    launchDirection: "N",
    pocket: { row: -1, col: 4 },
    inventory: { slash: 1, backslash: 1 },
    fixedPieces: [{ coord: { row: 3, col: 5 }, kind: "fixedSlash" }]
  };

  it("accepts valid puzzles", () => {
    expect(validatePuzzle(puzzle)).toEqual([]);
  });

  it("rejects starts that do not point inward", () => {
    expect(validatePuzzle({ ...puzzle, launchDirection: "S" })).toContain("Launch direction must point into the board.");
  });

  it("round trips exported puzzle data", () => {
    const parsed = parsePuzzleJson(serializePuzzle(puzzle));
    expect(parsed.errors).toEqual([]);
    expect(parsed.puzzle?.id).toBe("valid");
  });
});
