import type { PuzzleConfig } from "../game/types";

export const sampleCustomPuzzle: PuzzleConfig = {
  schemaVersion: 1,
  id: "custom-sample",
  title: "Custom Sample",
  size: 8,
  start: { row: 7, col: 1 },
  launchDirection: "N",
  pocket: { row: 8, col: 2 },
  inventory: { slash: 1, backslash: 1 },
  fixedPieces: [
    { coord: { row: 2, col: 1 }, kind: "glassSlash" },
    { coord: { row: 5, col: 5 }, kind: "fixedSlash" },
    { coord: { row: 1, col: 6 }, kind: "solidBlock" },
    { coord: { row: 6, col: 6 }, kind: "glassBlock" }
  ]
};
