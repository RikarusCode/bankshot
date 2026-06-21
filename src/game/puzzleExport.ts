import type { PuzzleConfig } from "./types";
import { validatePuzzle } from "./puzzleValidation";

export function serializePuzzle(puzzle: PuzzleConfig): string {
  return JSON.stringify(puzzle, null, 2);
}

export function parsePuzzleJson(source: string): { puzzle?: PuzzleConfig; errors: string[] } {
  try {
    const puzzle = JSON.parse(source) as PuzzleConfig;
    return { puzzle, errors: validatePuzzle(puzzle) };
  } catch (error) {
    return { errors: [error instanceof Error ? error.message : "Invalid JSON."] };
  }
}
