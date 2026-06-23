import { describe, expect, it } from "vitest";
import { parsePuzzleJson, serializePuzzle } from "./puzzleExport";
import { validatePlayerPieces, validatePuzzle } from "./puzzleValidation";
import type { PlayerPiece, PuzzleConfig } from "./types";

describe("puzzle validation", () => {
  const puzzle: PuzzleConfig = {
    schemaVersion: 1,
    id: "valid",
    size: 7,
    start: { row: 6, col: 1 },
    launchDirection: "N",
    pocket: { row: -1, col: 4 },
    inventory: [{ kind: "slash" }, { kind: "backslash" }],
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

  it("allows inventory pieces beyond rails and rejects extras", () => {
    const blockPuzzle = { ...puzzle, inventory: [{ kind: "solidBlock" }] } satisfies PuzzleConfig;
    const pieces: PlayerPiece[] = [{ id: "block", coord: { row: 2, col: 2 }, kind: "solidBlock" }];
    expect(validatePlayerPieces(blockPuzzle, pieces)).toEqual([]);
    expect(validatePlayerPieces(blockPuzzle, [...pieces, { id: "extra", coord: { row: 2, col: 3 }, kind: "solidBlock" }])).toContain("Too many player inventory pieces placed.");
  });
});
