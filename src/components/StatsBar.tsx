import type { DailyProgress, Mode, PuzzleConfig, StreakState } from "../game/types";

type StatsBarProps = {
  mode: Mode;
  puzzle: PuzzleConfig;
  progress?: DailyProgress;
  streak?: StreakState;
};

export function StatsBar({ mode, puzzle, progress, streak }: StatsBarProps) {
  return (
    <section className="stats-bar">
      <div>
        <span>Puzzle</span>
        <strong>{puzzle.number ? `#${puzzle.number}` : puzzle.title ?? puzzle.id}</strong>
      </div>
      <div>
        <span>Attempts</span>
        <strong>{mode === "daily" ? progress?.attempts ?? 0 : "Free"}</strong>
      </div>
      <div>
        <span>Streak</span>
        <strong>{mode === "daily" ? streak?.current ?? 0 : "-"}</strong>
      </div>
    </section>
  );
}
