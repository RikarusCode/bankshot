import { describe, expect, it } from "vitest";
import { publicArchive, saveRecord, type FunctionEnv } from "../../functions/_shared/archive";
import type { PuzzleConfig } from "./types";

function makeEnv(): FunctionEnv {
  const store = new Map<string, string>();
  return {
    BANKSHOT_TIME_ZONE: "America/Los_Angeles",
    BANKSHOT_ADMIN_PASSWORD: "test",
    BANKSHOT_ADMIN_SESSION_SECRET: "test-secret",
    PUZZLES_KV: {
      async get(key: string) {
        return store.get(key) ?? null;
      },
      async put(key: string, value: string) {
        store.set(key, value);
      },
      async delete(key: string) {
        store.delete(key);
      }
    }
  };
}

function puzzle(date: string, number: number): PuzzleConfig {
  return {
    schemaVersion: 1,
    id: `daily-${number}`,
    number,
    date,
    title: `Puzzle ${number}`,
    size: 8,
    start: { row: 7, col: 1 },
    launchDirection: "N",
    pocket: { row: -1, col: 6 },
    inventory: [{ kind: "slash" }, { kind: "backslash" }],
    fixedPieces: [{ coord: { row: 3, col: 3 }, kind: "fixedSlash" }]
  };
}

describe("publicArchive", () => {
  it("includes past puzzles and redacts future puzzle data", async () => {
    const env = makeEnv();
    await saveRecord(env, "2026-06-21", puzzle("2026-06-21", 1));
    await saveRecord(env, "2026-06-24", puzzle("2026-06-24", 4));

    const archive = await publicArchive(env, new Date("2026-06-22T12:00:00-07:00"));

    expect(archive.entries.find((entry) => entry.date === "2026-06-21")).toMatchObject({
      status: "available",
      title: "Puzzle 1",
      puzzle: expect.objectContaining({ id: "daily-1" })
    });
    expect(archive.entries.find((entry) => entry.date === "2026-06-24")).toEqual({
      date: "2026-06-24",
      number: 4,
      status: "locked"
    });
  });
});
