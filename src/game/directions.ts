import type { Coord, Direction, ReflectorOrientation } from "./types";

export const DIRECTIONS: Direction[] = ["N", "E", "S", "W"];

export function coordKey(coord: Coord): string {
  return `${coord.row},${coord.col}`;
}

export function sameCoord(a: Coord, b: Coord): boolean {
  return a.row === b.row && a.col === b.col;
}

export function addDirection(coord: Coord, direction: Direction): Coord {
  switch (direction) {
    case "N":
      return { row: coord.row - 1, col: coord.col };
    case "E":
      return { row: coord.row, col: coord.col + 1 };
    case "S":
      return { row: coord.row + 1, col: coord.col };
    case "W":
      return { row: coord.row, col: coord.col - 1 };
  }
}

export function isInside(coord: Coord, size: number): boolean {
  return coord.row >= 0 && coord.col >= 0 && coord.row < size && coord.col < size;
}

export function isEdge(coord: Coord, size: number): boolean {
  return isInside(coord, size) && (coord.row === 0 || coord.col === 0 || coord.row === size - 1 || coord.col === size - 1);
}

export function opposite(direction: Direction): Direction {
  switch (direction) {
    case "N":
      return "S";
    case "E":
      return "W";
    case "S":
      return "N";
    case "W":
      return "E";
  }
}

export function reflect(direction: Direction, orientation: ReflectorOrientation): Direction {
  if (orientation === "slash") {
    switch (direction) {
      case "N":
        return "E";
      case "E":
        return "N";
      case "S":
        return "W";
      case "W":
        return "S";
    }
  }

  switch (direction) {
    case "N":
      return "W";
    case "W":
      return "N";
    case "S":
      return "E";
    case "E":
      return "S";
  }
}

export function launchPointsInward(start: Coord, direction: Direction, size: number): boolean {
  const next = addDirection(start, direction);
  return isInside(start, size) && isInside(next, size);
}
