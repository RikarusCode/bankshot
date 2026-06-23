import { describe, expect, it } from "vitest";
import { computeScheduledStreak } from "../../functions/_shared/device";
import type { ScheduleEntry } from "../../functions/_shared/archive";

function schedule(...dates: string[]): ScheduleEntry[] {
  return dates.map((date, index) => ({ date, number: index + 1 }));
}

describe("computeScheduledStreak", () => {
  it("counts through today after today's puzzle is solved", () => {
    const streak = computeScheduledStreak(schedule("2026-06-21", "2026-06-22", "2026-06-23"), ["2026-06-21", "2026-06-22", "2026-06-23"], "2026-06-23");
    expect(streak).toEqual({ current: 3, lastSolvedDate: "2026-06-23" });
  });

  it("keeps yesterday's streak visible before today's puzzle is solved", () => {
    const streak = computeScheduledStreak(schedule("2026-06-21", "2026-06-22", "2026-06-23"), ["2026-06-21", "2026-06-22"], "2026-06-23");
    expect(streak).toEqual({ current: 2, lastSolvedDate: "2026-06-22" });
  });

  it("breaks on a missed scheduled puzzle, not on an unscheduled calendar gap", () => {
    const streak = computeScheduledStreak(schedule("2026-06-20", "2026-06-22", "2026-06-23"), ["2026-06-20", "2026-06-23"], "2026-06-23");
    expect(streak).toEqual({ current: 1, lastSolvedDate: "2026-06-23" });
  });
});
