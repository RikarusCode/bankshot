import { useEffect, useMemo, useState } from "react";
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
import type { Coord, DailyProgress, Mode, PlayerPiece, PuzzleConfig, SimulationResult, StreakState } from "./game/types";
import { sampleCustomPuzzle } from "./puzzles";

const dailyPuzzle = getDailyPuzzle();

function makePieceId(): string {
  return `piece-${crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)}`;
}

function hasInventory(puzzle: PuzzleConfig, pieces: PlayerPiece[], kind: "slash" | "backslash"): boolean {
  return pieces.filter((piece) => piece.kind === kind).length < puzzle.inventory[kind];
}

export default function App() {
  const [mode, setMode] = useState<Mode>("daily");
  const [customPuzzle, setCustomPuzzle] = useState<PuzzleConfig>(sampleCustomPuzzle);
  const [playerPieces, setPlayerPieces] = useState<PlayerPiece[]>([]);
  const [selectedPlacement, setSelectedPlacement] = useState<"slash" | "backslash" | undefined>();
  const [selectedPieceId, setSelectedPieceId] = useState<string | undefined>();
  const [result, setResult] = useState<SimulationResult | undefined>();
  const [activeStep, setActiveStep] = useState(0);
  const [locked, setLocked] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [dailyProgress, setDailyProgress] = useState<DailyProgress>(() => loadDailyProgress(dailyPuzzle.id, localDateString()));
  const [streak, setStreak] = useState<StreakState>(() => loadStreak());

  const puzzle = mode === "daily" ? dailyPuzzle : customPuzzle;
  const solved = mode === "daily" ? dailyProgress.solved : result?.status === "win";

  useEffect(() => {
    setPlayerPieces([]);
    setSelectedPlacement(undefined);
    setSelectedPieceId(undefined);
    setResult(undefined);
    setActiveStep(0);
    setLocked(false);
  }, [puzzle.id, mode]);

  useEffect(() => {
    if (!locked || !result) return;
    setActiveStep(0);
    const interval = window.setInterval(() => {
      setActiveStep((current) => {
        if (current >= result.path.length - 1) {
          window.clearInterval(interval);
          window.setTimeout(() => setLocked(false), 220);
          return current;
        }
        return current + 1;
      });
    }, 300);

    return () => window.clearInterval(interval);
  }, [locked, result]);

  const validationErrors = useMemo(() => validatePlayerPieces(puzzle, playerPieces), [puzzle, playerPieces]);
  const currentBall = result?.path[activeStep]
    ? { coord: result.path[activeStep].position, direction: result.path[activeStep].direction }
    : { coord: puzzle.start, direction: puzzle.launchDirection };

  function placePiece(kind: "slash" | "backslash", coord: Coord) {
    if (locked || !hasInventory(puzzle, playerPieces, kind)) return;
    if (!isCellAvailable(puzzle, playerPieces, coord.row, coord.col)) return;
    setPlayerPieces((current) => [...current, { id: makePieceId(), coord, kind }]);
    setSelectedPlacement(hasInventory(puzzle, [...playerPieces, { id: "preview", coord, kind }], kind) ? kind : undefined);
    setResult(undefined);
  }

  function movePiece(pieceId: string, coord: Coord) {
    if (locked || !isCellAvailable(puzzle, playerPieces, coord.row, coord.col, pieceId)) return;
    setPlayerPieces((current) => current.map((piece) => (piece.id === pieceId ? { ...piece, coord } : piece)));
    setSelectedPieceId(undefined);
    setResult(undefined);
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

  function clearBoard() {
    if (locked || solved) return;
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
              ball={currentBall}
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
            <ShootControls locked={locked} solved={Boolean(solved)} onShoot={shoot} onClear={clearBoard} onResetShot={() => setResult(undefined)} />
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
