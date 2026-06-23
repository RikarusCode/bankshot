import { describe, expect, it } from "vitest";
import { buildBallAnimationSegments } from "./animationPath";
import type { PathStep } from "./types";

function expectClose(actual: number, expected: number) {
  expect(actual).toBeGreaterThan(expected - 0.001);
  expect(actual).toBeLessThan(expected + 0.001);
}

describe("buildBallAnimationSegments", () => {
  it("keeps slash bounces as straight centerline impact segments", () => {
    const path: PathStep[] = [
      { position: { row: 3, col: 0 }, direction: "E", event: "move" },
      { position: { row: 3, col: 1 }, direction: "N", event: "bounce", pieceKind: "slash" },
      { position: { row: 2, col: 1 }, direction: "N", event: "move" }
    ];

    const segments = buildBallAnimationSegments(path, 7);
    expect(segments[0].kind).toBe("line");
    expect(segments[0].to.event).toBe("bounce");
    expect(segments[0].to.coord).toEqual({ row: 3, col: 1 });
    expect(segments[0].to.pieceCoord).toEqual({ row: 3, col: 1 });

    expect(segments[1].kind).toBe("line");
    expect(segments[1].from.coord).toEqual({ row: 3, col: 1 });
    expect(segments[1].to.coord).toEqual({ row: 2, col: 1 });
  });

  it("keeps backslash bounces as straight centerline impact segments", () => {
    const path: PathStep[] = [
      { position: { row: 3, col: 0 }, direction: "E", event: "move" },
      { position: { row: 3, col: 1 }, direction: "S", event: "bounce", pieceKind: "backslash" }
    ];

    const [segment] = buildBallAnimationSegments(path, 7);
    expect(segment.kind).toBe("line");
    expect(segment.to.coord).toEqual({ row: 3, col: 1 });
    expect(segment.to.event).toBe("bounce");
  });

  it("keeps glass diagonal break metadata on the curved impact", () => {
    const path: PathStep[] = [
      { position: { row: 3, col: 0 }, direction: "E", event: "move" },
      { position: { row: 3, col: 1 }, direction: "N", event: "break", pieceKind: "glassSlash" }
    ];

    const [segment] = buildBallAnimationSegments(path, 7);
    expect(segment.kind).toBe("line");
    expect(segment.to.event).toBe("break");
    expect(segment.to.pieceKind).toBe("glassSlash");
    expect(segment.to.pieceCoord).toEqual({ row: 3, col: 1 });
  });

  it("keeps solid block impacts as straight contact segments", () => {
    const path: PathStep[] = [
      { position: { row: 3, col: 0 }, direction: "E", event: "move" },
      { position: { row: 3, col: 0 }, direction: "W", event: "bounce", target: { row: 3, col: 1 }, pieceKind: "solidBlock" }
    ];

    const segments = buildBallAnimationSegments(path, 7);
    expect(segments[0].kind).toBe("line");
    expect(segments[0].to.event).toBe("bounce");
    expect(segments[0].to.pieceCoord).toEqual({ row: 3, col: 1 });
    expectClose(segments[0].to.coord.row, 3);
    expectClose(segments[0].to.coord.col, 0.22);
  });

  it("aims pocket entries into the rail pocket instead of back into the table", () => {
    const topPath: PathStep[] = [
      { position: { row: 1, col: 4 }, direction: "N", event: "move" },
      { position: { row: 0, col: 4 }, direction: "N", event: "move" },
      { position: { row: -1, col: 4 }, direction: "N", event: "pocket" }
    ];
    const bottomPath: PathStep[] = [
      { position: { row: 5, col: 2 }, direction: "S", event: "move" },
      { position: { row: 6, col: 2 }, direction: "S", event: "move" },
      { position: { row: 7, col: 2 }, direction: "S", event: "pocket" }
    ];

    const topSegments = buildBallAnimationSegments(topPath, 7);
    const bottomSegments = buildBallAnimationSegments(bottomPath, 7);
    expect(topSegments[topSegments.length - 1].to.coord.row).toBeLessThan(-0.5);
    expect(bottomSegments[bottomSegments.length - 1].to.coord.row).toBeGreaterThan(6.5);
  });
});
