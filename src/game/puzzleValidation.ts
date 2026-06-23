import { coordKey, isEdge, isInside, isPocketCoord, launchPointsInward } from "./directions";
import { normalizeInventory, remainingInventory } from "./inventory";
import type { Coord, Direction, InventoryItem, PieceKind, PlayerPiece, PuzzleConfig, ReflectorOrientation } from "./types";

const directions: Direction[] = ["N", "E", "S", "W"];
const fixedKinds: PieceKind[] = ["fixedSlash", "fixedBackslash", "solidBlock", "glassBlock", "glassSlash", "glassBackslash", "oneWayGate"];
const orientations: ReflectorOrientation[] = ["slash", "backslash"];
const inventoryKinds: PieceKind[] = ["slash", "backslash", "solidBlock", "glassBlock", "glassSlash", "glassBackslash", "oneWayGate"];

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
  const normalizedInventory = normalizeInventory(value.inventory);
  if (normalizedInventory.length === 0 && Array.isArray(value.inventory) && value.inventory.length > 0) errors.push("Inventory contains unknown piece types.");
  if (!Array.isArray(value.fixedPieces)) errors.push("fixedPieces must be an array.");
  if (errors.length > 0) return errors;

  if (!isEdge(puzzle.start, puzzle.size)) errors.push("Start must be on an edge cell.");
  if (!isPocketCoord(puzzle.pocket, puzzle.size)) errors.push("Pocket must be outside the board on a non-corner rail slot.");
  if (!launchPointsInward(puzzle.start, puzzle.launchDirection, puzzle.size)) errors.push("Launch direction must point into the board.");
  for (const item of normalizedInventory) {
    if (!inventoryKinds.includes(item.kind)) errors.push("Inventory contains an unknown piece type.");
    validateGateSettings(item, "Inventory item", errors);
  }

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
      validateGateSettings(fixed, `One-way gate at ${key}`, errors);
    }
  }

  return errors;
}

function validateGateSettings(item: InventoryItem | { gate?: InventoryItem["gate"]; kind: PieceKind }, label: string, errors: string[]) {
  if (item.kind !== "oneWayGate") return;
  if (!item.gate) {
    errors.push(`${label} needs gate settings.`);
    return;
  }
  if (!orientations.includes(item.gate.orientation)) errors.push(`${label} needs a valid rail orientation.`);
  if (!directions.includes(item.gate.passDirection)) errors.push(`${label} needs N, E, S, or W pass direction.`);
}

export function validatePlayerPieces(puzzle: PuzzleConfig, pieces: PlayerPiece[]): string[] {
  const errors: string[] = [];
  const occupied = new Set<string>([coordKey(puzzle.start), coordKey(puzzle.pocket)]);
  for (const fixed of puzzle.fixedPieces) occupied.add(coordKey(fixed.coord));

  for (const piece of pieces) {
    const key = coordKey(piece.coord);
    if (!isInside(piece.coord, puzzle.size)) errors.push(`Player piece ${piece.id} is outside the board.`);
    if (occupied.has(key)) errors.push(`Player piece ${piece.id} is on an unavailable cell.`);
    occupied.add(key);
    if (!inventoryKinds.includes(piece.kind)) errors.push(`Player piece ${piece.id} has an unknown kind.`);
  }

  if (remainingInventory(normalizeInventory(puzzle.inventory), pieces).length + pieces.length !== normalizeInventory(puzzle.inventory).length) {
    errors.push("Too many player inventory pieces placed.");
  }
  return errors;
}

export function isCellAvailable(puzzle: PuzzleConfig, pieces: PlayerPiece[], row: number, col: number, movingId?: string): boolean {
  const key = `${row},${col}`;
  if (!isInside({ row, col }, puzzle.size)) return false;
  if (coordKey(puzzle.start) === key || coordKey(puzzle.pocket) === key) return false;
  if (puzzle.fixedPieces.some((piece) => coordKey(piece.coord) === key)) return false;
  return !pieces.some((piece) => piece.id !== movingId && coordKey(piece.coord) === key);
}
