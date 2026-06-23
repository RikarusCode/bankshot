import { coordKey, isEdge, isInside, isPocketCoord, launchPointsInward } from "./directions";
import type { Coord, Direction, PieceKind, PlayerPiece, PuzzleConfig, ReflectorOrientation } from "./types";

const directions: Direction[] = ["N", "E", "S", "W"];
const fixedKinds: PieceKind[] = ["fixedSlash", "fixedBackslash", "solidBlock", "glassBlock", "glassSlash", "glassBackslash", "oneWayGate"];
const orientations: ReflectorOrientation[] = ["slash", "backslash"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function isCoord(value: unknown): value is Coord {
  return isRecord(value) && Number.isInteger(value.row) && Number.isInteger(value.col);
}

export function validatePuzzle(puzzle: PuzzleConfig): string[] {
  const errors: string[] = [];
  const value = puzzle as unknown;
  if (!isRecord(value)) return ["Puzzle JSON must be an object."];
  if (value.schemaVersion !== 1) errors.push("Unsupported schemaVersion.");
  if (typeof value.id !== "string" || value.id.trim() === "") errors.push("Puzzle id is required.");
  const size = value.size;
  if (typeof size !== "number" || !Number.isInteger(size) || size < 4 || size > 12) errors.push("Grid size must be between 4 and 12.");
  if (!isCoord(value.start)) errors.push("Start must be a row/col coordinate.");
  if (!isCoord(value.pocket)) errors.push("Pocket must be a row/col coordinate.");
  if (!directions.includes(value.launchDirection as Direction)) errors.push("Launch direction must be N, E, S, or W.");
  if (!isRecord(value.inventory) || !Number.isInteger(value.inventory.slash) || !Number.isInteger(value.inventory.backslash)) {
    errors.push("Inventory must include integer rail counts.");
  }
  if (!Array.isArray(value.fixedPieces)) errors.push("fixedPieces must be an array.");
  if (errors.length > 0) return errors;

  if (!isEdge(puzzle.start, puzzle.size)) errors.push("Start must be on an edge cell.");
  if (!isPocketCoord(puzzle.pocket, puzzle.size)) errors.push("Pocket must be outside the board on a non-corner rail slot.");
  if (!launchPointsInward(puzzle.start, puzzle.launchDirection, puzzle.size)) errors.push("Launch direction must point into the board.");
  if (puzzle.inventory.slash < 0 || puzzle.inventory.backslash < 0) errors.push("Inventory counts cannot be negative.");

  const occupied = new Set<string>([coordKey(puzzle.start), coordKey(puzzle.pocket)]);
  for (const fixed of puzzle.fixedPieces) {
    if (!isCoord(fixed.coord)) {
      errors.push("Every fixed piece needs a row/col coordinate.");
      continue;
    }
    const key = coordKey(fixed.coord);
    if (!isInside(fixed.coord, puzzle.size)) errors.push(`Fixed piece at ${key} is outside the board.`);
    if (occupied.has(key)) errors.push(`Cell ${key} has overlapping pieces.`);
    occupied.add(key);
    if (!fixedKinds.includes(fixed.kind)) errors.push(`Fixed piece at ${key} has an unknown kind.`);
    if (fixed.kind === "oneWayGate") {
      if (!fixed.gate) {
        errors.push(`One-way gate at ${key} needs gate settings.`);
      } else {
        if (!orientations.includes(fixed.gate.orientation)) errors.push(`One-way gate at ${key} needs a valid rail orientation.`);
        if (!directions.includes(fixed.gate.passDirection)) errors.push(`One-way gate at ${key} needs N, E, S, or W pass direction.`);
      }
    }
  }

  return errors;
}

export function validatePlayerPieces(puzzle: PuzzleConfig, pieces: PlayerPiece[]): string[] {
  const errors: string[] = [];
  const occupied = new Set<string>([coordKey(puzzle.start), coordKey(puzzle.pocket)]);
  for (const fixed of puzzle.fixedPieces) occupied.add(coordKey(fixed.coord));

  let slash = 0;
  let backslash = 0;
  for (const piece of pieces) {
    const key = coordKey(piece.coord);
    if (!isInside(piece.coord, puzzle.size)) errors.push(`Player piece ${piece.id} is outside the board.`);
    if (occupied.has(key)) errors.push(`Player piece ${piece.id} is on an unavailable cell.`);
    occupied.add(key);
    if (piece.kind === "slash") slash += 1;
    if (piece.kind === "backslash") backslash += 1;
  }

  if (slash > puzzle.inventory.slash) errors.push("Too many Rail A pieces placed.");
  if (backslash > puzzle.inventory.backslash) errors.push("Too many Rail B pieces placed.");
  return errors;
}

export function isCellAvailable(puzzle: PuzzleConfig, pieces: PlayerPiece[], row: number, col: number, movingId?: string): boolean {
  const key = `${row},${col}`;
  if (!isInside({ row, col }, puzzle.size)) return false;
  if (coordKey(puzzle.start) === key || coordKey(puzzle.pocket) === key) return false;
  if (puzzle.fixedPieces.some((piece) => coordKey(piece.coord) === key)) return false;
  return !pieces.some((piece) => piece.id !== movingId && coordKey(piece.coord) === key);
}
