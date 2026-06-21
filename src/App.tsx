import { useEffect, useMemo, useRef, useState } from "react";
import { Board } from "./components/Board";
import { Inventory } from "./components/Inventory";
import { ModeTabs } from "./components/ModeTabs";
import { PuzzleEditor } from "./components/PuzzleEditor";
import { PuzzleImportExport } from "./components/PuzzleImportExport";
import { ResultPanel } from "./components/ResultPanel";
import { RuleModal } from "./components/RuleModal";
import { ShareButton } from "./components/ShareButton";
import { ShootControls } from "./components/ShootControls";
import { StatsBar } from "./components/StatsBar";
import { coordKey } from "./game/directions";
import { getDailyPuzzle, localDateString } from "./game/daily";
import { validatePlayerPieces, isCellAvailable } from "./game/puzzleValidation";
import { shareText } from "./game/scoring";
import { simulateShot } from "./game/simulate";
import { loadDailyProgress, loadStreak, saveDailyProgress, updateStreakOnSolve } from "./game/storage";
import type { Coord, DailyProgress, Direction, Mode, PathStep, PlayerPiece, PuzzleConfig, SimulationResult, StreakState } from "./game/types";
import { sampleCustomPuzzle } from "./puzzles";

const dailyPuzzle = getDailyPuzzle();
const BALL_SPEED_CELLS_PER_SECOND = 4.8;

type RenderBall = {
  coord: Coord;
  direction: Direction;
};

type BallWaypoint = RenderBall & {
  holdMs?: number;
};

function makePieceId(): string {
  return `piece-${crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)}`;
}

function hasInventory(puzzle: PuzzleConfig, pieces: PlayerPiece[], kind: "slash" | "backslash"): boolean {
  return pieces.filter((piece) => piece.kind === kind).length < puzzle.inventory[kind];
}

function directionDelta(direction: Direction): Coord {
  switch (direction) {
    case "N":
      return { row: -1, col: 0 };
    case "E":
      return { row: 0, col: 1 };
    case "S":
      return { row: 1, col: 0 };
    case "W":
      return { row: 0, col: -1 };
  }
}

function distance(a: Coord, b: Coord): number {
  return Math.hypot(a.row - b.row, a.col - b.col);
}

function pointNearCellFace(position: Coord, incoming: Direction): Coord {
  const delta = directionDelta(incoming);
  return {
    row: position.row + delta.row * 0.44,
    col: position.col + delta.col * 0.44
  };
}

function buildBallWaypoints(path: PathStep[]): BallWaypoint[] {
  if (path.length === 0) return [];
  const waypoints: BallWaypoint[] = [{ coord: path[0].position, direction: path[0].direction }];

  for (let index = 1; index < path.length; index += 1) {
    const previous = path[index - 1];
    const step = path[index];
    const incoming = previous.direction;

    if ((step.event === "bounce" || step.event === "break") && (step.pieceKind === "solidBlock" || step.pieceKind === "crackedBlock")) {
      waypoints.push({ coord: pointNearCellFace(step.position, incoming), direction: incoming, holdMs: 36 });
      waypoints.push({ coord: step.position, direction: step.direction });
      continue;
    }

    if (step.event === "rail") {
      waypoints.push({ coord: pointNearCellFace(step.position, incoming), direction: incoming, holdMs: 28 });
      waypoints.push({ coord: step.position, direction: step.direction });
      continue;
    }

    waypoints.push({
      coord: step.position,
      direction: step.direction,
      holdMs: step.event === "bounce" || step.event === "break" ? 32 : undefined
    });
  }

  return waypoints;
}

export default function App() {
  const [mode, setMode] = useState<Mode>("daily");
  const [customPuzzle, setCustomPuzzle] = useState<PuzzleConfig>(sampleCustomPuzzle);
  const [playerPieces, setPlayerPieces] = useState<PlayerPiece[]>([]);
  const [selectedPlacement, setSelectedPlacement] = useState<"slash" | "backslash" | undefined>();
  const [selectedPieceId, setSelectedPieceId] = useState<string | undefined>();
  const [result, setResult] = useState<SimulationResult | undefined>();
  const [ball, setBall] = useState<RenderBall>({ coord: dailyPuzzle.start, direction: dailyPuzzle.launchDirection });
  const [locked, setLocked] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [dailyProgress, setDailyProgress] = useState<DailyProgress>(() => loadDailyProgress(dailyPuzzle.id, localDateString()));
  const [streak, setStreak] = useState<StreakState>(() => loadStreak());
  const animationFrameRef = useRef<number | undefined>(undefined);

  const puzzle = mode === "daily" ? dailyPuzzle : customPuzzle;
  const solved = mode === "daily" ? dailyProgress.solved : result?.status === "win";

  useEffect(() => {
    setPlayerPieces([]);
    setSelectedPlacement(undefined);
    setSelectedPieceId(undefined);
    setResult(undefined);
    setBall({ coord: puzzle.start, direction: puzzle.launchDirection });
    setLocked(false);
  }, [puzzle.id, mode]);

  useEffect(() => {
    if (!locked || !result) return;
    const waypoints = buildBallWaypoints(result.path);
    if (waypoints.length === 0) return;

    const segments = waypoints.slice(1).map((point, index) => {
      const from = waypoints[index];
      const segmentDistance = distance(from.coord, point.coord);
      const duration = Math.max(70, (segmentDistance / BALL_SPEED_CELLS_PER_SECOND) * 1000 + (from.holdMs ?? 0));
      return { from, to: point, duration };
    });

    let segmentIndex = 0;
    let segmentStartedAt: number | undefined;
    setBall(waypoints[0]);

    const animate = (time: number) => {
      const segment = segments[segmentIndex];
      if (!segment) {
        setBall(waypoints[waypoints.length - 1]);
        setLocked(false);
        return;
      }

      if (segmentStartedAt === undefined) segmentStartedAt = time;
      const elapsed = time - segmentStartedAt;
      const progress = Math.min(1, elapsed / segment.duration);
      const eased = progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;

      setBall({
        coord: {
          row: segment.from.coord.row + (segment.to.coord.row - segment.from.coord.row) * eased,
          col: segment.from.coord.col + (segment.to.coord.col - segment.from.coord.col) * eased
        },
        direction: progress < 1 ? segment.from.direction : segment.to.direction
      });

      if (progress >= 1) {
        segmentIndex += 1;
        segmentStartedAt = undefined;
      }

      animationFrameRef.current = window.requestAnimationFrame(animate);
    };

    animationFrameRef.current = window.requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current !== undefined) window.cancelAnimationFrame(animationFrameRef.current);
    };
  }, [locked, result]);

  const validationErrors = useMemo(() => validatePlayerPieces(puzzle, playerPieces), [puzzle, playerPieces]);

  function placePiece(kind: "slash" | "backslash", coord: Coord) {
    if (locked || !hasInventory(puzzle, playerPieces, kind)) return;
    if (!isCellAvailable(puzzle, playerPieces, coord.row, coord.col)) return;
    setPlayerPieces((current) => [...current, { id: makePieceId(), coord, kind }]);
    setSelectedPlacement(hasInventory(puzzle, [...playerPieces, { id: "preview", coord, kind }], kind) ? kind : undefined);
    setResult(undefined);
    setBall({ coord: puzzle.start, direction: puzzle.launchDirection });
  }

  function movePiece(pieceId: string, coord: Coord) {
    if (locked || !isCellAvailable(puzzle, playerPieces, coord.row, coord.col, pieceId)) return;
    setPlayerPieces((current) => current.map((piece) => (piece.id === pieceId ? { ...piece, coord } : piece)));
    setSelectedPieceId(undefined);
    setResult(undefined);
    setBall({ coord: puzzle.start, direction: puzzle.launchDirection });
  }

  function handleCellClick(coord: Coord) {
    if (locked || solved) return;
    const pieceAtCell = playerPieces.find((piece) => coordKey(piece.coord) === coordKey(coord));
    if (pieceAtCell) {
      if (selectedPieceId === pieceAtCell.id) {
        setPlayerPieces((current) => current.filter((piece) => piece.id !== pieceAtCell.id));
        setSelectedPieceId(undefined);
      } else {
        setSelectedPieceId(pieceAtCell.id);
        setSelectedPlacement(undefined);
      }
      setResult(undefined);
      setBall({ coord: puzzle.start, direction: puzzle.launchDirection });
      return;
    }

    if (selectedPieceId) {
      movePiece(selectedPieceId, coord);
      return;
    }

    if (selectedPlacement) {
      placePiece(selectedPlacement, coord);
    }
  }

  function selectInventory(kind: "slash" | "backslash") {
    if (locked || solved || !hasInventory(puzzle, playerPieces, kind)) return;
    setSelectedPlacement((current) => (current === kind ? undefined : kind));
    setSelectedPieceId(undefined);
  }

  function shoot() {
    if (locked || validationErrors.length > 0 || solved) return;
    const nextResult = simulateShot(puzzle, playerPieces);
    setResult(nextResult);
    setLocked(true);
    setSelectedPlacement(undefined);
    setSelectedPieceId(undefined);

    if (mode === "daily") {
      const nextProgress: DailyProgress = {
        ...dailyProgress,
        attempts: dailyProgress.attempts + 1,
        solved: dailyProgress.solved || nextResult.status === "win",
        solvedAttempts: nextResult.status === "win" ? dailyProgress.attempts + 1 : dailyProgress.solvedAttempts,
        shotHistory: [...dailyProgress.shotHistory, nextResult.status]
      };
      setDailyProgress(nextProgress);
      saveDailyProgress(nextProgress);
      if (nextResult.status === "win") setStreak(updateStreakOnSolve(nextProgress.date));
    }
  }

  function stopShot() {
    if (animationFrameRef.current !== undefined) window.cancelAnimationFrame(animationFrameRef.current);
    setLocked(false);
    setBall({ coord: puzzle.start, direction: puzzle.launchDirection });
  }

  function resetBall() {
    stopShot();
    setResult(undefined);
  }

  function clearBoard() {
    if (solved && !locked) return;
    stopShot();
    setPlayerPieces([]);
    setSelectedPieceId(undefined);
    setResult(undefined);
  }

  function importCustomPuzzle(nextPuzzle: PuzzleConfig) {
    setCustomPuzzle(nextPuzzle);
    setMode("custom");
  }

  const share = shareText(puzzle, dailyProgress, streak);

  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">Daily logic billiards</p>
          <h1>Bankshot</h1>
        </div>
        <button className="icon-button" onClick={() => setRulesOpen(true)} aria-label="Open rules">
          ?
        </button>
      </header>

      <ModeTabs mode={mode} onModeChange={setMode} />

      {mode === "editor" ? (
        <PuzzleEditor onPlayPuzzle={importCustomPuzzle} />
      ) : (
        <div className="play-layout">
          <section className="game-column">
            <StatsBar mode={mode} puzzle={puzzle} progress={dailyProgress} streak={streak} />
            <Board
              puzzle={puzzle}
              playerPieces={playerPieces}
              selectedPieceId={selectedPieceId}
              selectedPlacement={selectedPlacement}
              locked={locked || Boolean(solved)}
              ball={ball}
              onCellClick={handleCellClick}
              onMovePiece={movePiece}
              onDropNewPiece={placePiece}
              onDragPlayerPiece={(piece) => {
                setSelectedPieceId(piece.id);
                setSelectedPlacement(undefined);
              }}
            />
            {validationErrors.length > 0 && (
              <ul className="errors">
                {validationErrors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            )}
          </section>

          <aside className="side-panel">
            <Inventory inventory={puzzle.inventory} playerPieces={playerPieces} selectedPlacement={selectedPlacement} locked={locked || solved} onSelect={selectInventory} />
            <ShootControls animating={locked} solved={Boolean(solved)} onShoot={shoot} onClear={clearBoard} onResetBall={resetBall} />
            <ResultPanel result={result} />
            {mode === "daily" && <ShareButton text={share} disabled={!dailyProgress.solved} />}
            {mode === "custom" && <PuzzleImportExport puzzle={customPuzzle} onImport={importCustomPuzzle} />}
          </aside>
        </div>
      )}

      <RuleModal open={rulesOpen} onClose={() => setRulesOpen(false)} />
    </main>
  );
}
