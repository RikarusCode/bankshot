import type { PuzzleConfig } from "../game/types";

export const sampleCustomPuzzle: PuzzleConfig = {
  schemaVersion: 1,
  id: "custom-sample",
  title: "Custom Sample",
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
};
