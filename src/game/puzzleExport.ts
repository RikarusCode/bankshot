import type { PuzzleConfig } from "./types";
import { validatePuzzle } from "./puzzleValidation";

export function serializePuzzle(puzzle: PuzzleConfig): string {
  return JSON.stringify(puzzle, null, 2);
}

function normalizeLegacyPieceKinds(puzzle: PuzzleConfig): PuzzleConfig {
  return {
    ...puzzle,
    fixedPieces: puzzle.fixedPieces.map((piece) => {
      const kind = piece.kind as string;
      if (kind === "crackedBlock") return { ...piece, kind: "glassBlock" };
      if (kind === "crackedSlash") return { ...piece, kind: "glassSlash" };
      if (kind === "crackedBackslash") return { ...piece, kind: "glassBackslash" };
      return piece;
    })
  } as PuzzleConfig;
}

export function parsePuzzleJson(source: string): { puzzle?: PuzzleConfig; errors: string[] } {
  try {
    const puzzle = normalizeLegacyPieceKinds(JSON.parse(source) as PuzzleConfig);
    return { puzzle, errors: validatePuzzle(puzzle) };
  } catch (error) {
    return { errors: [error instanceof Error ? error.message : "Invalid JSON."] };
  }
}
