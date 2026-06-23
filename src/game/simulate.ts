import { addDirection, coordKey, isInside, opposite, reflect, sameCoord } from "./directions";
import type { FixedPiece, PathStep, PieceKind, PlayerPiece, PuzzleConfig, ReflectorOrientation, SimulationResult } from "./types";

type RuntimePiece = {
  coord: string;
  kind: PieceKind;
  gate?: FixedPiece["gate"];
};

function orientationFor(kind: PieceKind): ReflectorOrientation | null {
  if (kind === "slash" || kind === "fixedSlash" || kind === "glassSlash") return "slash";
  if (kind === "backslash" || kind === "fixedBackslash" || kind === "glassBackslash") return "backslash";
  return null;
}

function gatePassDirections(orientation: ReflectorOrientation, passDirection: PuzzleConfig["launchDirection"]): PuzzleConfig["launchDirection"][] {
  if (orientation === "slash") {
    return passDirection === "N" || passDirection === "E" ? ["S", "W"] : ["N", "E"];
  }

  return passDirection === "N" || passDirection === "W" ? ["S", "E"] : ["N", "W"];
}

function mutableStateKey(map: Map<string, RuntimePiece>): string {
  return [...map.values()]
    .filter((piece) => piece.kind.startsWith("glass"))
    .map((piece) => `${piece.coord}:${piece.kind}`)
    .sort()
    .join("|");
}

function bounceOffWall(position: { row: number; col: number }, direction: PuzzleConfig["launchDirection"], size: number): PuzzleConfig["launchDirection"] {
  const next = addDirection(position, direction);
  if (next.row < 0 || next.row >= size || next.col < 0 || next.col >= size) return opposite(direction);
  return direction;
}

export function buildPieceMap(puzzle: PuzzleConfig, playerPieces: PlayerPiece[]): Map<string, RuntimePiece> {
  const map = new Map<string, RuntimePiece>();

  for (const fixed of puzzle.fixedPieces) {
    map.set(coordKey(fixed.coord), {
      coord: coordKey(fixed.coord),
      kind: fixed.kind,
      gate: fixed.gate
    });
  }

  for (const piece of playerPieces) {
    map.set(coordKey(piece.coord), {
      coord: coordKey(piece.coord),
      kind: piece.kind
    });
  }

  return map;
}

export function simulateShot(puzzle: PuzzleConfig, playerPieces: PlayerPiece[]): SimulationResult {
  const pieces = buildPieceMap(puzzle, playerPieces);
  const path: PathStep[] = [
    {
      position: puzzle.start,
      direction: puzzle.launchDirection,
      event: "move"
    }
  ];
  const seen = new Map<string, number>();
  const maxSteps = puzzle.size * puzzle.size * 256;
  const loopAnnouncementRepetitions = 5;
  let position = puzzle.start;
  let direction = puzzle.launchDirection;
  let bounces = 0;

  for (let step = 0; step < maxSteps; step += 1) {
    const stateKey = `${coordKey(position)}:${direction}:${mutableStateKey(pieces)}`;
    const visits = seen.get(stateKey) ?? 0;
    if (visits >= loopAnnouncementRepetitions) {
      path.push({ position, direction, event: "loop" });
      return { status: "loop", path, bounces, reason: "loopGuard" };
    }
    seen.set(stateKey, visits + 1);

    const next = addDirection(position, direction);
    if (!isInside(next, puzzle.size)) {
      direction = bounceOffWall(position, direction, puzzle.size);
      bounces += 1;
      path.push({ position, direction, event: "rail", target: next });
      continue;
    }

    if (sameCoord(next, puzzle.pocket)) {
      position = next;
      path.push({ position: next, direction, event: "pocket" });
      return { status: "win", path, bounces };
    }

    const piece = pieces.get(coordKey(next));
    if (!piece) {
      position = next;
      path.push({ position, direction, event: "move" });
      continue;
    }

    if (piece.kind === "solidBlock") {
      direction = opposite(direction);
      bounces += 1;
      path.push({ position, direction, event: "bounce", target: next, pieceKind: piece.kind });
      continue;
    }

    if (piece.kind === "glassBlock") {
      pieces.delete(piece.coord);
      direction = opposite(direction);
      bounces += 1;
      path.push({ position, direction, event: "break", target: next, pieceKind: piece.kind });
      continue;
    }

    if (piece.kind === "oneWayGate") {
      const gate = piece.gate ?? { orientation: "slash" as const, passDirection: "E" as const };
      if (gatePassDirections(gate.orientation, gate.passDirection).includes(direction)) {
        position = next;
        path.push({ position, direction, event: "move", pieceKind: piece.kind });
        continue;
      }
      position = next;
      direction = reflect(direction, gate.orientation);
      bounces += 1;
      path.push({ position, direction, event: "bounce", pieceKind: piece.kind });
      continue;
    }

    const orientation = orientationFor(piece.kind);
    if (orientation) {
      if (piece.kind === "glassSlash" || piece.kind === "glassBackslash") {
        pieces.delete(piece.coord);
      }
      position = next;
      direction = reflect(direction, orientation);
      bounces += 1;
      path.push({
        position,
        direction,
        event: piece.kind === "glassSlash" || piece.kind === "glassBackslash" ? "break" : "bounce",
        pieceKind: piece.kind
      });
      continue;
    }
  }

  path.push({ position, direction, event: "loop" });
  return { status: "loop", path, bounces, reason: "loopGuard" };
}
