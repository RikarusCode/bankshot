import type { Coord, Direction, PathStep, PieceKind } from "./types";

const CONTACT_OFFSET_CELLS = 0.22;
const POCKET_CENTER_OFFSET_CELLS = 0.27;
const CURVE_LENGTH_SAMPLES = 12;

export type BallAnimationPoint = {
  coord: Coord;
  direction: Direction;
  event?: PathStep["event"];
  pieceKind?: PathStep["pieceKind"];
  pieceCoord?: Coord;
  holdMs?: number;
};

export type BallAnimationSegment =
  | {
      kind: "line";
      from: BallAnimationPoint;
      to: BallAnimationPoint;
      distance: number;
    }
  | {
      kind: "curve";
      from: BallAnimationPoint;
      to: BallAnimationPoint;
      control1: Coord;
      control2: Coord;
      distance: number;
    };

export function directionDelta(direction: Direction): Coord {
  switch (direction) {
    case "N":
      return { row: -1, col: 0 };
    case "E":
      return { row: 0, col: 1 };
    case "S":
      return { row: 1, col: 0 };
    case "W":
      return { row: 0, col: -1 };
  }
}

export function distance(a: Coord, b: Coord): number {
  return Math.hypot(a.row - b.row, a.col - b.col);
}

export function cubicBezierPoint(start: Coord, control1: Coord, control2: Coord, end: Coord, progress: number): Coord {
  const t = Math.max(0, Math.min(1, progress));
  const inverse = 1 - t;
  const startWeight = inverse * inverse * inverse;
  const control1Weight = 3 * inverse * inverse * t;
  const control2Weight = 3 * inverse * t * t;
  const endWeight = t * t * t;

  return {
    row: start.row * startWeight + control1.row * control1Weight + control2.row * control2Weight + end.row * endWeight,
    col: start.col * startWeight + control1.col * control1Weight + control2.col * control2Weight + end.col * endWeight
  };
}

function contactPoint(position: Coord, incoming: Direction): Coord {
  const delta = directionDelta(incoming);
  return {
    row: position.row + delta.row * CONTACT_OFFSET_CELLS,
    col: position.col + delta.col * CONTACT_OFFSET_CELLS
  };
}

function pocketMouthPoint(position: Coord, size: number): Coord {
  if (position.row < 0) return { row: -0.5 - POCKET_CENTER_OFFSET_CELLS, col: position.col };
  if (position.row >= size) return { row: size - 0.5 + POCKET_CENTER_OFFSET_CELLS, col: position.col };
  if (position.col < 0) return { row: position.row, col: -0.5 - POCKET_CENTER_OFFSET_CELLS };
  if (position.col >= size) return { row: position.row, col: size - 0.5 + POCKET_CENTER_OFFSET_CELLS };
  return position;
}

function isDiagonalPiece(kind?: PieceKind) {
  return kind === "slash" || kind === "backslash" || kind === "fixedSlash" || kind === "fixedBackslash" || kind === "glassSlash" || kind === "glassBackslash" || kind === "oneWayGate";
}

function curveDistance(start: Coord, control1: Coord, control2: Coord, end: Coord): number {
  let total = 0;
  let previous = start;

  for (let sample = 1; sample <= CURVE_LENGTH_SAMPLES; sample += 1) {
    const point = cubicBezierPoint(start, control1, control2, end, sample / CURVE_LENGTH_SAMPLES);
    total += distance(previous, point);
    previous = point;
  }

  return total;
}

function makePoint(step: PathStep, coord = step.position): BallAnimationPoint {
  return {
    coord,
    direction: step.direction,
    event: step.event,
    pieceKind: step.pieceKind
  };
}

function pushLine(segments: BallAnimationSegment[], from: BallAnimationPoint, to: BallAnimationPoint) {
  segments.push({
    kind: "line",
    from,
    to,
    distance: distance(from.coord, to.coord)
  });
}

export function buildBallAnimationSegments(path: PathStep[], size: number): BallAnimationSegment[] {
  if (path.length < 2) return [];

  const segments: BallAnimationSegment[] = [];
  let cursor = makePoint(path[0]);

  for (let index = 1; index < path.length; index += 1) {
    const previous = path[index - 1];
    const step = path[index];
    const incoming = previous.direction;

    if ((step.event === "bounce" || step.event === "break") && (step.pieceKind === "solidBlock" || step.pieceKind === "glassBlock")) {
      const contact = makePoint(step, contactPoint(step.position, incoming));
      contact.pieceCoord = step.target;
      contact.holdMs = 38;
      pushLine(segments, cursor, contact);
      cursor = contact;

      const rebound = makePoint({ ...step, event: "move" }, step.position);
      pushLine(segments, cursor, rebound);
      cursor = rebound;
      continue;
    }

    if (step.event === "rail") {
      const contact = makePoint(step, contactPoint(step.position, incoming));
      contact.holdMs = 32;
      pushLine(segments, cursor, contact);
      cursor = contact;

      const rebound = makePoint({ ...step, event: "move" }, step.position);
      pushLine(segments, cursor, rebound);
      cursor = rebound;
      continue;
    }

    if (step.event === "pocket") {
      const entry = makePoint({ ...step, event: "move" }, step.position);
      pushLine(segments, cursor, entry);
      cursor = entry;

      const pocket = makePoint(step, pocketMouthPoint(step.position, size));
      pocket.holdMs = 30;
      pushLine(segments, cursor, pocket);
      cursor = pocket;
      continue;
    }

    if ((step.event === "bounce" || step.event === "break") && isDiagonalPiece(step.pieceKind)) {
      const impact = makePoint(step, step.position);
      impact.pieceCoord = step.position;
      pushLine(segments, cursor, impact);
      cursor = impact;
      continue;
    }

    const next = makePoint(step);
    pushLine(segments, cursor, next);
    cursor = next;
  }

  return segments;
}

export function interpolateBallSegment(segment: BallAnimationSegment, progress: number): Coord {
  if (segment.kind === "curve") {
    return cubicBezierPoint(segment.from.coord, segment.control1, segment.control2, segment.to.coord, progress);
  }

  return {
    row: segment.from.coord.row + (segment.to.coord.row - segment.from.coord.row) * progress,
    col: segment.from.coord.col + (segment.to.coord.col - segment.from.coord.col) * progress
  };
}
