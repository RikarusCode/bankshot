import { describe, expect, it } from "vitest";
import { simulateShot } from "./simulate";
import type { PlayerPiece, PuzzleConfig } from "./types";
import { dailyPuzzles } from "../puzzles/dailyPuzzles";

const basePuzzle: PuzzleConfig = {
  schemaVersion: 1,
  id: "test",
  size: 7,
  start: { row: 6, col: 1 },
  launchDirection: "N",
  pocket: { row: 7, col: 4 },
  inventory: { slash: 2, backslash: 2 },
  fixedPieces: [{ coord: { row: 2, col: 4 }, kind: "fixedBackslash" }]
};

it("wins by entering bumper cells before turning", () => {
  const pieces: PlayerPiece[] = [{ id: "a", coord: { row: 2, col: 1 }, kind: "slash" }];
  const result = simulateShot(basePuzzle, pieces);
  expect(result.status).toBe("win");
  expect(result.bounces).toBe(2);
  expect(result.path.some((step) => step.position.row === 2 && step.position.col === 1 && step.event === "bounce")).toBe(true);
});

it("bounces off rails instead of missing when the ball reaches the board edge", () => {
  const result = simulateShot({ ...basePuzzle, fixedPieces: [] }, []);
  expect(result.status).toBe("loop");
  expect(result.path.some((step) => step.event === "rail")).toBe(true);
});

it("only enters side pockets from the direct approach", () => {
  const result = simulateShot(
    {
      ...basePuzzle,
      start: { row: 6, col: 6 },
      launchDirection: "N",
      pocket: { row: 3, col: 7 },
      fixedPieces: []
    },
    []
  );
  expect(result.status).toBe("loop");
  expect(result.path.some((step) => step.event === "pocket")).toBe(false);
  expect(result.path.some((step) => step.event === "rail" && step.target?.row === 3 && step.target.col === 7)).toBe(false);
});

it("bounces back after entering a solid block cell", () => {
  const result = simulateShot(
    {
      ...basePuzzle,
      fixedPieces: [{ coord: { row: 3, col: 1 }, kind: "solidBlock" }]
    },
    []
  );
  expect(result.status).toBe("loop");
  expect(
    result.path.some(
      (step) =>
        step.position.row === 4 &&
        step.position.col === 1 &&
        step.target?.row === 3 &&
        step.target.col === 1 &&
        step.event === "bounce" &&
        step.pieceKind === "solidBlock"
    )
  ).toBe(true);
});

it("glass blocks bounce back once and disappear for loop state", () => {
  const result = simulateShot(
    {
      ...basePuzzle,
      start: { row: 3, col: 0 },
      launchDirection: "E",
      pocket: { row: -1, col: 6 },
      fixedPieces: [{ coord: { row: 3, col: 2 }, kind: "glassBlock" }]
    },
    []
  );
  expect(result.status).toBe("loop");
  expect(result.path.some((step) => step.event === "break" && step.pieceKind === "glassBlock")).toBe(true);
  expect(result.bounces).toBeGreaterThanOrEqual(1);
});

it("glass slash reflects once and then is removed", () => {
  const result = simulateShot(
    {
      ...basePuzzle,
      start: { row: 3, col: 0 },
      launchDirection: "E",
      pocket: { row: -1, col: 2 },
      fixedPieces: [{ coord: { row: 3, col: 2 }, kind: "glassSlash" }]
    },
    []
  );
  expect(result.status).toBe("win");
  expect(result.path.some((step) => step.event === "break" && step.pieceKind === "glassSlash")).toBe(true);
});

it("one-way gates pass from both directions on the green side", () => {
  const eastSideEntry = simulateShot(
    {
      ...basePuzzle,
      start: { row: 3, col: 6 },
      launchDirection: "W",
      pocket: { row: 3, col: -1 },
      fixedPieces: [{ coord: { row: 3, col: 2 }, kind: "oneWayGate", gate: { orientation: "slash", passDirection: "E" } }]
    },
    []
  );
  const northSideEntry = simulateShot(
    {
      ...basePuzzle,
      start: { row: 0, col: 2 },
      launchDirection: "S",
      pocket: { row: 7, col: 2 },
      fixedPieces: [{ coord: { row: 3, col: 2 }, kind: "oneWayGate", gate: { orientation: "slash", passDirection: "E" } }]
    },
    []
  );
  expect(eastSideEntry.status).toBe("win");
  expect(northSideEntry.status).toBe("win");
  expect(eastSideEntry.bounces).toBe(0);
  expect(northSideEntry.bounces).toBe(0);
});

it("one-way gates reflect from blocked approaches", () => {
  const westSideEntry = simulateShot(
    {
      ...basePuzzle,
      start: { row: 3, col: 0 },
      launchDirection: "E",
      pocket: { row: 3, col: -1 },
      fixedPieces: [{ coord: { row: 3, col: 2 }, kind: "oneWayGate", gate: { orientation: "slash", passDirection: "E" } }]
    },
    []
  );
  const southSideEntry = simulateShot(
    {
      ...basePuzzle,
      start: { row: 6, col: 2 },
      launchDirection: "N",
      pocket: { row: 3, col: 7 },
      fixedPieces: [{ coord: { row: 3, col: 2 }, kind: "oneWayGate", gate: { orientation: "slash", passDirection: "E" } }]
    },
    []
  );
  expect(westSideEntry.bounces).toBeGreaterThanOrEqual(1);
  expect(southSideEntry.bounces).toBeGreaterThanOrEqual(1);
  expect(southSideEntry.status).toBe("win");
});

it("detects loops with current mutable board state", () => {
  const result = simulateShot(
    {
      ...basePuzzle,
      start: { row: 6, col: 1 },
      launchDirection: "N",
      pocket: { row: -1, col: 6 },
      fixedPieces: []
    },
    []
  );
  expect(result.status).toBe("loop");
  expect(result.path.filter((step) => step.event === "rail").length).toBeGreaterThanOrEqual(5);
});

it("solves the current 8x8 daily playtest puzzle", () => {
  const puzzle = dailyPuzzles.find((item) => item.id === "daily-002-glass-rail");
  expect(puzzle).toBeDefined();
  const result = simulateShot(puzzle!, [
    { id: "a", coord: { row: 2, col: 5 }, kind: "backslash" },
    { id: "b", coord: { row: 5, col: 2 }, kind: "slash" }
  ]);
  expect(result.status).toBe("win");
});
