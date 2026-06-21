import type { PuzzleConfig } from "../game/types";

export const dailyPuzzles: PuzzleConfig[] = [
  {
    schemaVersion: 1,
    id: "daily-001",
    number: 1,
    date: "2026-06-21",
    title: "Opening Rail",
    size: 7,
    start: { row: 6, col: 1 },
    launchDirection: "N",
    pocket: { row: 6, col: 4 },
    inventory: { slash: 1, backslash: 0 },
    fixedPieces: [
      { coord: { row: 2, col: 4 }, kind: "fixedBackslash" },
      { coord: { row: 1, col: 1 }, kind: "solidBlock" },
      { coord: { row: 5, col: 5 }, kind: "crackedBlock" }
    ]
  },
  {
    schemaVersion: 1,
    id: "daily-002",
    number: 2,
    date: "2026-06-22",
    title: "Glass Rail",
    size: 7,
    start: { row: 3, col: 0 },
    launchDirection: "E",
    pocket: { row: 0, col: 2 },
    inventory: { slash: 0, backslash: 0 },
    fixedPieces: [
      { coord: { row: 3, col: 2 }, kind: "crackedSlash" },
      { coord: { row: 5, col: 4 }, kind: "solidBlock" },
      { coord: { row: 1, col: 5 }, kind: "fixedBackslash" }
    ]
  },
  {
    schemaVersion: 1,
    id: "daily-003",
    number: 3,
    date: "2026-06-23",
    title: "One Way Out",
    size: 7,
    start: { row: 0, col: 1 },
    launchDirection: "S",
    pocket: { row: 2, col: 6 },
    inventory: { slash: 0, backslash: 1 },
    fixedPieces: [
      {
        coord: { row: 2, col: 4 },
        kind: "oneWayGate",
        gate: { orientation: "slash", passDirection: "E" }
      },
      { coord: { row: 5, col: 2 }, kind: "crackedBlock" }
    ]
  }
];
