import { describe, expect, it } from "vitest";
import { simulateShot } from "./simulate";
import type { PlayerPiece, PuzzleConfig } from "./types";

const basePuzzle: PuzzleConfig = {
  schemaVersion: 1,
  id: "test",
  size: 7,
  start: { row: 6, col: 1 },
  launchDirection: "N",
  pocket: { row: 6, col: 4 },
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

it("bounces back after entering a solid block cell", () => {
  const result = simulateShot(
    {
      ...basePuzzle,
      fixedPieces: [{ coord: { row: 3, col: 1 }, kind: "solidBlock" }]
    },
    []
  );
  expect(result.status).toBe("loop");
  expect(result.path.some((step) => step.position.row === 3 && step.position.col === 1 && step.event === "bounce" && step.pieceKind === "solidBlock")).toBe(true);
});

it("cracked blocks bounce back once and disappear for loop state", () => {
  const result = simulateShot(
    {
      ...basePuzzle,
      start: { row: 3, col: 0 },
      launchDirection: "E",
      pocket: { row: 0, col: 6 },
      fixedPieces: [{ coord: { row: 3, col: 2 }, kind: "crackedBlock" }]
    },
    []
  );
  expect(result.status).toBe("loop");
  expect(result.path.some((step) => step.event === "break" && step.pieceKind === "crackedBlock")).toBe(true);
  expect(result.bounces).toBeGreaterThanOrEqual(1);
});

it("cracked slash reflects once and then is removed", () => {
  const result = simulateShot(
    {
      ...basePuzzle,
      start: { row: 3, col: 0 },
      launchDirection: "E",
      pocket: { row: 0, col: 2 },
      fixedPieces: [{ coord: { row: 3, col: 2 }, kind: "crackedSlash" }]
    },
    []
  );
  expect(result.status).toBe("win");
  expect(result.path.some((step) => step.event === "break" && step.pieceKind === "crackedSlash")).toBe(true);
});

it("one-way gates pass from the configured direction", () => {
  const result = simulateShot(
    {
      ...basePuzzle,
      start: { row: 3, col: 0 },
      launchDirection: "E",
      pocket: { row: 3, col: 6 },
      fixedPieces: [{ coord: { row: 3, col: 2 }, kind: "oneWayGate", gate: { orientation: "slash", passDirection: "E" } }]
    },
    []
  );
  expect(result.status).toBe("win");
});

it("one-way gates reflect from blocked approaches", () => {
  const result = simulateShot(
    {
      ...basePuzzle,
      start: { row: 6, col: 2 },
      launchDirection: "N",
      pocket: { row: 3, col: 6 },
      fixedPieces: [{ coord: { row: 3, col: 2 }, kind: "oneWayGate", gate: { orientation: "slash", passDirection: "E" } }]
    },
    []
  );
  expect(result.bounces).toBe(1);
  expect(result.status).toBe("win");
});

it("detects loops with current mutable board state", () => {
  const result = simulateShot(
    {
      ...basePuzzle,
      start: { row: 6, col: 1 },
      launchDirection: "N",
      pocket: { row: 0, col: 6 },
      fixedPieces: []
    },
    []
  );
  expect(result.status).toBe("loop");
  expect(result.path.filter((step) => step.event === "rail").length).toBeGreaterThanOrEqual(5);
});
