import { useEffect, useMemo, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Board } from "./components/Board";
import { ArchivePanel } from "./components/ArchivePanel";
import { Inventory } from "./components/Inventory";
import { ModeTabs } from "./components/ModeTabs";
import { PuzzleEditor } from "./components/PuzzleEditor";
import { PuzzleImportExport } from "./components/PuzzleImportExport";
import { ResultPanel } from "./components/ResultPanel";
import { RuleModal } from "./components/RuleModal";
import { ShareButton } from "./components/ShareButton";
import { ShootControls } from "./components/ShootControls";
import { StatsBar } from "./components/StatsBar";
import { fetchDailyPuzzle, fetchServerProgress, saveServerSolve } from "./game/archiveApi";
import { coordKey } from "./game/directions";
import { inventoryItemClass, inventoryItemKey, remainingInventory } from "./game/inventory";
import { validatePlayerPieces, isCellAvailable } from "./game/puzzleValidation";
import { shareText } from "./game/scoring";
import { simulateShot } from "./game/simulate";
import { primeAudio } from "./game/sound";
import { loadDailyProgress, loadStreak, saveDailyProgress, saveStreak, updateStreakOnSolve } from "./game/storage";
import type { Coord, DailyProgress, InventoryItem, Mode, PlayerPiece, PuzzleConfig, SimulationResult, StreakState } from "./game/types";
import { sampleCustomPuzzle } from "./puzzles";

type DragState = {
  item: InventoryItem;
  pieceId?: string;
  x: number;
  y: number;
};

function makePieceId(): string {
  return `piece-${crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)}`;
}

function hasInventory(puzzle: PuzzleConfig, pieces: PlayerPiece[], item: InventoryItem): boolean {
  return remainingInventory(puzzle.inventory, pieces).some((current) => inventoryItemKey(current) === inventoryItemKey(item));
}

function SoundIcon({ muted }: { muted: boolean }) {
  return (
    <svg className="sound-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 9.5v5h3.6l4.9 4.1V5.4L7.6 9.5H4Z" />
      {muted ? (
        <>
          <path className="sound-stroke" d="m16.2 9.2 4.1 4.1" />
          <path className="sound-stroke" d="m20.3 9.2-4.1 4.1" />
        </>
      ) : (
        <>
          <path className="sound-stroke" d="M16 8.2c1.1.9 1.7 2.2 1.7 3.8s-.6 2.9-1.7 3.8" />
          <path className="sound-stroke" d="M18.7 5.7c1.8 1.5 2.8 3.7 2.8 6.3s-1 4.8-2.8 6.3" />
        </>
      )}
    </svg>
  );
}

export default function App() {
  const [mode, setMode] = useState<Mode>("daily");
  const [dailyPuzzle, setDailyPuzzle] = useState<PuzzleConfig | undefined>();
  const [dailyStatus, setDailyStatus] = useState<"loading" | "ready" | "missing" | "error">("loading");
  const [dailyMessage, setDailyMessage] = useState("");
  const [customPuzzle, setCustomPuzzle] = useState<PuzzleConfig>(sampleCustomPuzzle);
  const [editorPuzzle, setEditorPuzzle] = useState<PuzzleConfig>({ ...sampleCustomPuzzle, id: "my-bankshot-puzzle", title: "My Puzzle" });
  const [archivePuzzle, setArchivePuzzle] = useState<PuzzleConfig | undefined>();
  const [archiveDate, setArchiveDate] = useState<string | undefined>();
  const [playerPieces, setPlayerPieces] = useState<PlayerPiece[]>([]);
  const [selectedPlacement, setSelectedPlacement] = useState<InventoryItem | undefined>();
  const [selectedPieceId, setSelectedPieceId] = useState<string | undefined>();
  const [shot, setShot] = useState<{ id: number; result: SimulationResult } | undefined>();
  const [revealedResult, setRevealedResult] = useState<SimulationResult | undefined>();
  const [locked, setLocked] = useState(false);
  const [dragging, setDragging] = useState<DragState | undefined>();
  const [muted, setMuted] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [dailyProgress, setDailyProgress] = useState<DailyProgress | undefined>();
  const [streak, setStreak] = useState<StreakState>(() => loadStreak());
  const [activeDailyAttempt, setActiveDailyAttempt] = useState<number | undefined>();

  const puzzle = mode === "daily" ? dailyPuzzle : mode === "archive" ? archivePuzzle : customPuzzle;

  useEffect(() => {
    if (muted) return;
    let cancelled = false;

    function warmAudio() {
      if (cancelled) return;
      void primeAudio(false);
    }

    window.addEventListener("pointerdown", warmAudio, { once: true, capture: true });
    window.addEventListener("keydown", warmAudio, { once: true, capture: true });
    return () => {
      cancelled = true;
      window.removeEventListener("pointerdown", warmAudio, { capture: true });
      window.removeEventListener("keydown", warmAudio, { capture: true });
    };
  }, [muted]);

  useEffect(() => {
    let cancelled = false;

    async function loadDaily() {
      setDailyStatus("loading");
      setDailyMessage("");
      const result = await fetchDailyPuzzle();
      if (cancelled) return;
      if (result.data) {
        const nextPuzzle = result.data.puzzle;
        const nextDailyProgress = loadDailyProgress(nextPuzzle.id, nextPuzzle.date ?? result.data.date);
        setDailyPuzzle(nextPuzzle);
        setDailyProgress(nextDailyProgress);
        setDailyStatus("ready");
        const progressResult = await fetchServerProgress();
        if (cancelled) return;
        if (progressResult.data) {
          setStreak(progressResult.data.streak);
          saveStreak(progressResult.data.streak);
          if (progressResult.data.solvedToday) {
            const attempts = progressResult.data.todayAttempts ?? nextDailyProgress.solvedAttempts ?? nextDailyProgress.attempts;
            const syncedProgress: DailyProgress = {
              ...nextDailyProgress,
              attempts: Math.max(nextDailyProgress.attempts, attempts),
              solved: true,
              solvedAttempts: attempts
            };
            setDailyProgress(syncedProgress);
            saveDailyProgress(syncedProgress);
          }
        }
      } else {
        setDailyPuzzle(undefined);
        setDailyProgress(undefined);
        setDailyStatus(result.status === 404 ? "missing" : "error");
        setDailyMessage(result.error ?? "Could not load today's puzzle.");
      }
    }

    void loadDaily();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setPlayerPieces([]);
    setSelectedPlacement(undefined);
    setSelectedPieceId(undefined);
    setShot(undefined);
    setRevealedResult(undefined);
    setLocked(false);
    setActiveDailyAttempt(undefined);
  }, [puzzle?.id, mode]);

  const validationErrors = useMemo(() => (puzzle ? validatePlayerPieces(puzzle, playerPieces) : []), [puzzle, playerPieces]);
  const shootDisabled = !puzzle || locked || Boolean(revealedResult) || validationErrors.length > 0;

  useEffect(() => {
    if (!dragging) return;
    const activeDrag = dragging;

    function handlePointerMove(event: PointerEvent) {
      setDragging((current) => (current ? { ...current, x: event.clientX, y: event.clientY } : current));
    }

    function handlePointerUp(event: PointerEvent) {
      const target = document.elementFromPoint(event.clientX, event.clientY);
      const cell = target?.closest?.(".cell") as HTMLElement | null;
      if (cell?.dataset.row && cell.dataset.col) {
        const coord = { row: Number(cell.dataset.row), col: Number(cell.dataset.col) };
        if (activeDrag.pieceId) movePiece(activeDrag.pieceId, coord);
        else placePiece(activeDrag.item, coord);
      } else if (activeDrag.pieceId && target?.closest?.("[data-inventory-drop='true']")) {
        setPlayerPieces((current) => current.filter((piece) => piece.id !== activeDrag.pieceId));
        setShot(undefined);
        setRevealedResult(undefined);
      }
      setDragging(undefined);
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp, { once: true });
    window.addEventListener("pointercancel", handlePointerUp, { once: true });
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };
  }, [dragging, playerPieces, puzzle, locked]);

  function startInventoryDrag(item: InventoryItem, event: ReactPointerEvent) {
    if (!puzzle) return;
    if (locked || !hasInventory(puzzle, playerPieces, item)) return;
    event.preventDefault();
    event.stopPropagation();
    setSelectedPlacement(undefined);
    setSelectedPieceId(undefined);
    setDragging({ item, x: event.clientX, y: event.clientY });
  }

  function startPieceDrag(piece: PlayerPiece, event: ReactPointerEvent) {
    if (locked) return;
    event.preventDefault();
    event.stopPropagation();
    setSelectedPlacement(undefined);
    setSelectedPieceId(piece.id);
    setDragging({ item: { kind: piece.kind, gate: piece.gate }, pieceId: piece.id, x: event.clientX, y: event.clientY });
  }

  function placePiece(item: InventoryItem, coord: Coord) {
    if (!puzzle) return;
    if (locked || !hasInventory(puzzle, playerPieces, item)) return;
    if (!isCellAvailable(puzzle, playerPieces, coord.row, coord.col)) return;
    const nextPiece: PlayerPiece = { id: makePieceId(), coord, kind: item.kind, gate: item.gate };
    setPlayerPieces((current) => [...current, nextPiece]);
    setSelectedPlacement(hasInventory(puzzle, [...playerPieces, nextPiece], item) ? item : undefined);
    setShot(undefined);
    setRevealedResult(undefined);
  }

  function movePiece(pieceId: string, coord: Coord) {
    if (!puzzle) return;
    if (locked || !isCellAvailable(puzzle, playerPieces, coord.row, coord.col, pieceId)) return;
    setPlayerPieces((current) => current.map((piece) => (piece.id === pieceId ? { ...piece, coord } : piece)));
    setSelectedPieceId(undefined);
    setShot(undefined);
    setRevealedResult(undefined);
  }

  function handleCellClick(coord: Coord) {
    if (locked) return;
    const pieceAtCell = playerPieces.find((piece) => coordKey(piece.coord) === coordKey(coord));
    if (pieceAtCell) {
      if (selectedPieceId === pieceAtCell.id) {
        setPlayerPieces((current) => current.filter((piece) => piece.id !== pieceAtCell.id));
        setSelectedPieceId(undefined);
      } else {
        setSelectedPieceId(pieceAtCell.id);
        setSelectedPlacement(undefined);
      }
      setShot(undefined);
      setRevealedResult(undefined);
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

  function selectInventory(item: InventoryItem) {
    if (!puzzle) return;
    if (locked || !hasInventory(puzzle, playerPieces, item)) return;
    setSelectedPlacement((current) => (current && inventoryItemKey(current) === inventoryItemKey(item) ? undefined : item));
    setSelectedPieceId(undefined);
  }

  async function shoot() {
    if (!puzzle) return;
    if (shootDisabled) return;
    setLocked(true);
    try {
      await primeAudio(muted);
    } catch {
      // If the browser rejects audio unlock, keep gameplay responsive.
    }
    const nextResult = simulateShot(puzzle, playerPieces);
    setShot({ id: Date.now(), result: nextResult });
    setRevealedResult(undefined);
    setSelectedPlacement(undefined);
    setSelectedPieceId(undefined);

    if (mode === "daily" && dailyProgress && !dailyProgress.solved) {
      const attemptNumber = dailyProgress.attempts + 1;
      const nextProgress: DailyProgress = {
        ...dailyProgress,
        attempts: attemptNumber,
        shotHistory: dailyProgress.shotHistory
      };
      setActiveDailyAttempt(attemptNumber);
      setDailyProgress(nextProgress);
      saveDailyProgress(nextProgress);
    }
  }

  function stopShot() {
    setLocked(false);
    setShot(undefined);
    setActiveDailyAttempt(undefined);
  }

  function resetBall() {
    stopShot();
    setRevealedResult(undefined);
  }

  function clearBoard() {
    stopShot();
    setPlayerPieces([]);
    setSelectedPieceId(undefined);
    setRevealedResult(undefined);
  }

  function completeShot(result: SimulationResult) {
    setLocked(false);
    setRevealedResult(result);

    if (mode === "daily" && dailyProgress && !dailyProgress.solved) {
      const completedAttempts = activeDailyAttempt ?? dailyProgress.attempts;
      const nextProgress: DailyProgress = {
        ...dailyProgress,
        attempts: Math.max(dailyProgress.attempts, completedAttempts),
        solved: result.status === "win",
        solvedAttempts: result.status === "win" ? completedAttempts : dailyProgress.solvedAttempts,
        shotHistory: [...dailyProgress.shotHistory, result.status]
      };
      setDailyProgress(nextProgress);
      saveDailyProgress(nextProgress);
      setActiveDailyAttempt(undefined);
      if (result.status === "win" && dailyPuzzle) {
        const localFallback = updateStreakOnSolve(nextProgress.date);
        setStreak(localFallback);
        void saveServerSolve({
          date: nextProgress.date,
          puzzleId: dailyPuzzle.id,
          puzzleNumber: dailyPuzzle.number,
          attempts: completedAttempts
        }).then((progressResult) => {
          if (!progressResult.data) return;
          setStreak(progressResult.data.streak);
          saveStreak(progressResult.data.streak);
        });
      }
    }
  }

  function importCustomPuzzle(nextPuzzle: PuzzleConfig) {
    setCustomPuzzle(nextPuzzle);
    setMode("custom");
  }

  function playEditorPuzzle(nextPuzzle: PuzzleConfig) {
    setEditorPuzzle(nextPuzzle);
    importCustomPuzzle(nextPuzzle);
  }

  function playArchivePuzzle(nextPuzzle: PuzzleConfig, date: string) {
    setArchivePuzzle(nextPuzzle);
    setArchiveDate(date);
    setMode("archive");
  }

  const share = dailyPuzzle && dailyProgress ? shareText(dailyPuzzle, dailyProgress, streak) : "";

  return (
    <main className={`app-shell mode-${mode}`}>
      <header className="app-header">
        <div>
          <p className="eyebrow">Daily logic billiards</p>
          <h1>Bankshot</h1>
        </div>
        <div className="header-actions">
          <button className="icon-button" onClick={() => setMuted((current) => !current)} aria-label={muted ? "Unmute sounds" : "Mute sounds"}>
            <SoundIcon muted={muted} />
          </button>
          <button className="icon-button" onClick={() => setRulesOpen(true)} aria-label="Open rules">
            ?
          </button>
        </div>
      </header>

      <ModeTabs mode={mode} onModeChange={setMode} />

      {mode === "editor" ? (
        <PuzzleEditor puzzle={editorPuzzle} onPuzzleChange={setEditorPuzzle} onPlayPuzzle={playEditorPuzzle} />
      ) : mode === "daily" && !puzzle ? (
        <section className="empty-state">
          <h2>{dailyStatus === "loading" ? "Loading today's Bankshot..." : "No daily puzzle scheduled"}</h2>
          {dailyStatus !== "loading" && <p>{dailyMessage || "Check the archive or add today's puzzle through the admin tools."}</p>}
        </section>
      ) : (
        <div className="play-layout">
          <section className="game-column">
            {puzzle ? (
              <>
                {mode !== "custom" && <StatsBar mode={mode} puzzle={puzzle} progress={dailyProgress} streak={streak} />}
                <div className="board-play-area">
                  <Inventory inventory={puzzle.inventory} playerPieces={playerPieces} selectedItem={selectedPlacement} locked={locked} onSelect={selectInventory} onStartDrag={startInventoryDrag} />
                  <Board
                    puzzle={puzzle}
                    playerPieces={playerPieces}
                    selectedPieceId={selectedPieceId}
                    locked={locked}
                    shot={shot}
                    muted={muted}
                    onShotComplete={completeShot}
                    onCellClick={handleCellClick}
                    onStartPieceDrag={startPieceDrag}
                  />
                </div>
              </>
            ) : (
              <section className="empty-state">
                <h2>Choose an archive puzzle</h2>
                <p>Available past puzzles can be played from the archive list.</p>
              </section>
            )}
            {validationErrors.length > 0 && (
              <ul className="errors">
                {validationErrors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            )}
          </section>

          <aside className="side-panel">
            {mode === "archive" && <ArchivePanel selectedDate={archiveDate} onPlayPuzzle={playArchivePuzzle} />}
            {puzzle && (
              <>
                <ShootControls animating={locked} disabled={shootDisabled} onShoot={shoot} onClear={clearBoard} onResetBall={resetBall} />
                <ResultPanel result={revealedResult} />
              </>
            )}
            {mode === "daily" && <ShareButton text={share} disabled={!dailyProgress?.solved} />}
            {mode === "custom" && <PuzzleImportExport puzzle={customPuzzle} onImport={importCustomPuzzle} />}
          </aside>
        </div>
      )}

      {dragging && (
        <div className="drag-preview" style={{ transform: `translate3d(${dragging.x - 28}px, ${dragging.y - 28}px, 0)` }}>
          <span className="backpack-piece">
            <span className={inventoryItemClass(dragging.item)} />
          </span>
        </div>
      )}

      <RuleModal open={rulesOpen} onClose={() => setRulesOpen(false)} />
    </main>
  );
}
