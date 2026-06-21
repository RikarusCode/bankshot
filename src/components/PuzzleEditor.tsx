import { useMemo, useState } from "react";
import { DIRECTIONS } from "../game/directions";
import { serializePuzzle } from "../game/puzzleExport";
import { validatePuzzle } from "../game/puzzleValidation";
import type { Coord, Direction, FixedPiece, PieceKind, PuzzleConfig, ReflectorOrientation } from "../game/types";
import { sampleCustomPuzzle } from "../puzzles";

type EditorTool = "start" | "pocket" | Exclude<PieceKind, "slash" | "backslash"> | "erase";

type PuzzleEditorProps = {
  onPlayPuzzle: (puzzle: PuzzleConfig) => void;
};

const fixedTools: Array<{ tool: EditorTool; label: string }> = [
  { tool: "start", label: "Start" },
  { tool: "pocket", label: "Pocket" },
  { tool: "fixedSlash", label: "Fixed /" },
  { tool: "fixedBackslash", label: "Fixed \\" },
  { tool: "solidBlock", label: "Block" },
  { tool: "crackedBlock", label: "Cracked Block" },
  { tool: "crackedSlash", label: "Cracked /" },
  { tool: "crackedBackslash", label: "Cracked \\" },
  { tool: "oneWayGate", label: "Gate" },
  { tool: "erase", label: "Erase" }
];

function key(coord: Coord): string {
  return `${coord.row},${coord.col}`;
}

export function PuzzleEditor({ onPlayPuzzle }: PuzzleEditorProps) {
  const [puzzle, setPuzzle] = useState<PuzzleConfig>({ ...sampleCustomPuzzle, id: "my-bankshot-puzzle", title: "My Puzzle" });
  const [tool, setTool] = useState<EditorTool>("fixedSlash");
  const [gateOrientation, setGateOrientation] = useState<ReflectorOrientation>("slash");
  const [gatePassDirection, setGatePassDirection] = useState<Direction>("E");
  const errors = useMemo(() => validatePuzzle(puzzle), [puzzle]);

  function updateSize(size: number) {
    const clamped = Math.max(4, Math.min(12, size));
    setPuzzle((current) => ({
      ...current,
      size: clamped,
      start: { row: clamped - 1, col: Math.min(current.start.col, clamped - 1) },
      pocket: { row: 0, col: Math.min(current.pocket.col, clamped - 1) },
      fixedPieces: current.fixedPieces.filter((piece) => piece.coord.row < clamped && piece.coord.col < clamped)
    }));
  }

  function applyTool(coord: Coord) {
    setPuzzle((current) => {
      const fixedPieces = current.fixedPieces.filter((piece) => key(piece.coord) !== key(coord));
      if (tool === "start") return { ...current, start: coord, fixedPieces };
      if (tool === "pocket") return { ...current, pocket: coord, fixedPieces };
      if (tool === "erase") return { ...current, fixedPieces };
      const nextPiece: FixedPiece = {
        coord,
        kind: tool,
        gate: tool === "oneWayGate" ? { orientation: gateOrientation, passDirection: gatePassDirection } : undefined
      };
      return { ...current, fixedPieces: [...fixedPieces, nextPiece] };
    });
  }

  async function copyJson() {
    await navigator.clipboard.writeText(serializePuzzle(puzzle));
  }

  const cells: Coord[] = [];
  for (let row = 0; row < puzzle.size; row += 1) {
    for (let col = 0; col < puzzle.size; col += 1) cells.push({ row, col });
  }

  return (
    <section className="editor-shell">
      <div className="editor-controls">
        <label>
          Title
          <input value={puzzle.title ?? ""} onChange={(event) => setPuzzle({ ...puzzle, title: event.target.value })} />
        </label>
        <label>
          Size
          <input type="number" min={4} max={12} value={puzzle.size} onChange={(event) => updateSize(Number(event.target.value))} />
        </label>
        <label>
          Launch
          <select value={puzzle.launchDirection} onChange={(event) => setPuzzle({ ...puzzle, launchDirection: event.target.value as PuzzleConfig["launchDirection"] })}>
            {DIRECTIONS.map((direction) => (
              <option key={direction} value={direction}>
                {direction}
              </option>
            ))}
          </select>
        </label>
        <label>
          / Inventory
          <input
            type="number"
            min={0}
            value={puzzle.inventory.slash}
            onChange={(event) => setPuzzle({ ...puzzle, inventory: { ...puzzle.inventory, slash: Number(event.target.value) } })}
          />
        </label>
        <label>
          \ Inventory
          <input
            type="number"
            min={0}
            value={puzzle.inventory.backslash}
            onChange={(event) => setPuzzle({ ...puzzle, inventory: { ...puzzle.inventory, backslash: Number(event.target.value) } })}
          />
        </label>
        <label>
          Gate Shape
          <select value={gateOrientation} onChange={(event) => setGateOrientation(event.target.value as ReflectorOrientation)}>
            <option value="slash">/</option>
            <option value="backslash">\</option>
          </select>
        </label>
        <label>
          Gate Pass
          <select value={gatePassDirection} onChange={(event) => setGatePassDirection(event.target.value as Direction)}>
            {DIRECTIONS.map((direction) => (
              <option key={direction} value={direction}>
                {direction}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="tool-palette">
        {fixedTools.map((item) => (
          <button key={item.tool} className={tool === item.tool ? "active" : ""} onClick={() => setTool(item.tool)}>
            {item.label}
          </button>
        ))}
      </div>

      <div className="editor-board" style={{ gridTemplateColumns: `repeat(${puzzle.size}, 1fr)` }}>
        {cells.map((coord) => {
          const fixed = puzzle.fixedPieces.find((piece) => key(piece.coord) === key(coord));
          const isStart = key(coord) === key(puzzle.start);
          const isPocket = key(coord) === key(puzzle.pocket);
          return (
            <button key={key(coord)} className={`editor-cell ${isStart ? "start" : ""} ${isPocket ? "pocket" : ""}`} onClick={() => applyTool(coord)}>
              {isStart ? "S" : isPocket ? "P" : fixed?.kind === "fixedSlash" || fixed?.kind === "crackedSlash" ? "/" : fixed?.kind === "fixedBackslash" || fixed?.kind === "crackedBackslash" ? "\\" : fixed?.kind === "solidBlock" ? "B" : fixed?.kind === "crackedBlock" ? "C" : fixed?.kind === "oneWayGate" ? "G" : ""}
            </button>
          );
        })}
      </div>

      {errors.length > 0 && (
        <ul className="errors">
          {errors.map((error) => (
            <li key={error}>{error}</li>
          ))}
        </ul>
      )}

      <div className="editor-actions">
        <button onClick={copyJson}>
          Copy JSON
        </button>
        <button className="primary" disabled={errors.length > 0} onClick={() => onPlayPuzzle(puzzle)}>
          Play Puzzle
        </button>
      </div>
    </section>
  );
}
