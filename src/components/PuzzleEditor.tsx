import { useEffect, useMemo, useState, type PointerEvent as ReactPointerEvent } from "react";
import { DIRECTIONS, isInside, isPocketCoord } from "../game/directions";
import { serializePuzzle } from "../game/puzzleExport";
import { validatePuzzle } from "../game/puzzleValidation";
import type { Coord, Direction, FixedPiece, PieceKind, PuzzleConfig, ReflectorOrientation } from "../game/types";

type EditorTool = "start" | "pocket" | Exclude<PieceKind, "slash" | "backslash"> | "erase";
type DraggableEditorObject = { kind: "start"; coord: Coord } | { kind: "pocket"; coord: Coord } | { kind: "fixed"; piece: FixedPiece };
type EditorDragState = DraggableEditorObject & {
  x: number;
  y: number;
};

type PuzzleEditorProps = {
  puzzle: PuzzleConfig;
  onPuzzleChange: (puzzle: PuzzleConfig) => void;
  onPlayPuzzle: (puzzle: PuzzleConfig) => void;
};

const fixedTools: Array<{ tool: EditorTool; label: string }> = [
  { tool: "start", label: "Start" },
  { tool: "pocket", label: "Pocket" },
  { tool: "fixedSlash", label: "Fixed /" },
  { tool: "fixedBackslash", label: "Fixed \\" },
  { tool: "solidBlock", label: "Block" },
  { tool: "glassBlock", label: "Glass Block" },
  { tool: "glassSlash", label: "Glass /" },
  { tool: "glassBackslash", label: "Glass \\" },
  { tool: "oneWayGate", label: "Gate" },
  { tool: "erase", label: "Erase" }
];

function key(coord: Coord): string {
  return `${coord.row},${coord.col}`;
}

function gateSideClass(piece: FixedPiece): string {
  if (!piece.gate) return " gate-slash gate-pass-ne";
  const orientationClass = piece.gate.orientation === "slash" ? "gate-slash" : "gate-backslash";
  let sideClass = "gate-pass-ne";
  if (piece.gate.orientation === "slash") {
    sideClass = piece.gate.passDirection === "N" || piece.gate.passDirection === "E" ? "gate-pass-ne" : "gate-pass-sw";
  } else {
    sideClass = piece.gate.passDirection === "N" || piece.gate.passDirection === "W" ? "gate-pass-nw" : "gate-pass-se";
  }
  return ` ${orientationClass} ${sideClass}`;
}

function editorPieceClass(piece: FixedPiece): string {
  const kind = piece.kind;
  const orientation = kind === "fixedSlash" || kind === "glassSlash" ? " slash-wall" : kind === "fixedBackslash" || kind === "glassBackslash" ? " backslash-wall" : "";
  if (kind.startsWith("glass")) return `editor-piece glass${orientation}`;
  if (kind === "solidBlock") return "editor-piece block";
  if (kind === "oneWayGate") return `editor-piece gate${gateSideClass(piece)}`;
  return `editor-piece fixed${orientation}`;
}

function draggableAt(puzzle: PuzzleConfig, coord: Coord): DraggableEditorObject | undefined {
  if (key(coord) === key(puzzle.start)) return { kind: "start", coord: puzzle.start };
  if (key(coord) === key(puzzle.pocket)) return { kind: "pocket", coord: puzzle.pocket };
  const piece = puzzle.fixedPieces.find((fixed) => key(fixed.coord) === key(coord));
  return piece ? { kind: "fixed", piece } : undefined;
}

function canMoveObject(puzzle: PuzzleConfig, object: DraggableEditorObject, target: Coord): boolean {
  if (object.kind === "pocket") return isPocketCoord(target, puzzle.size);
  if (!isInside(target, puzzle.size)) return false;
  if (object.kind !== "start" && key(target) === key(puzzle.start)) return false;
  return !puzzle.fixedPieces.some((piece) => key(piece.coord) === key(target) && (object.kind !== "fixed" || key(piece.coord) !== key(object.piece.coord)));
}

function moveObject(puzzle: PuzzleConfig, object: DraggableEditorObject, target: Coord): PuzzleConfig {
  if (!canMoveObject(puzzle, object, target)) return puzzle;
  if (object.kind === "start") return { ...puzzle, start: target };
  if (object.kind === "pocket") return { ...puzzle, pocket: target };
  return {
    ...puzzle,
    fixedPieces: puzzle.fixedPieces.map((piece) => (key(piece.coord) === key(object.piece.coord) ? { ...piece, coord: target } : piece))
  };
}

export function PuzzleEditor({ puzzle, onPuzzleChange, onPlayPuzzle }: PuzzleEditorProps) {
  const [tool, setTool] = useState<EditorTool>("fixedSlash");
  const [gateOrientation, setGateOrientation] = useState<ReflectorOrientation>("slash");
  const [gatePassDirection, setGatePassDirection] = useState<Direction>("E");
  const [dragging, setDragging] = useState<EditorDragState | undefined>();
  const [suppressClickKey, setSuppressClickKey] = useState<string | undefined>();
  const errors = useMemo(() => validatePuzzle(puzzle), [puzzle]);

  useEffect(() => {
    if (!dragging) return;
    const activeDrag = dragging;

    function handlePointerMove(event: PointerEvent) {
      setDragging((current) => (current ? { ...current, x: event.clientX, y: event.clientY } : current));
    }

    function handlePointerUp(event: PointerEvent) {
      const target = document.elementFromPoint(event.clientX, event.clientY);
      const cell = target?.closest?.(".editor-cell") as HTMLElement | null;
      if (cell?.dataset.row && cell.dataset.col) {
        const coord = { row: Number(cell.dataset.row), col: Number(cell.dataset.col) };
        onPuzzleChange(moveObject(puzzle, activeDrag, coord));
      }
      setSuppressClickKey(key(activeDrag.kind === "fixed" ? activeDrag.piece.coord : activeDrag.coord));
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
  }, [dragging, onPuzzleChange, puzzle]);

  function updateSize(size: number) {
    const clamped = Math.max(4, Math.min(12, size));
    onPuzzleChange({
      ...puzzle,
      size: clamped,
      start: { row: clamped - 1, col: Math.min(puzzle.start.col, clamped - 1) },
      pocket: isPocketCoord(puzzle.pocket, clamped) ? puzzle.pocket : { row: -1, col: Math.min(puzzle.pocket.col, clamped - 1) },
      fixedPieces: puzzle.fixedPieces.filter((piece) => isInside(piece.coord, clamped))
    });
  }

  function applyTool(coord: Coord) {
    if (suppressClickKey === key(coord)) {
      setSuppressClickKey(undefined);
      return;
    }

    const inside = isInside(coord, puzzle.size);
    const pocketSlot = isPocketCoord(coord, puzzle.size);
    if (!inside && tool === "pocket" && pocketSlot) return onPuzzleChange({ ...puzzle, pocket: coord });
    if (!inside && tool === "erase" && key(coord) === key(puzzle.pocket)) return onPuzzleChange({ ...puzzle, pocket: { row: -1, col: 0 } });
    if (!inside) return;

    const fixedPieces = puzzle.fixedPieces.filter((piece) => key(piece.coord) !== key(coord));
    if (tool === "start") return onPuzzleChange({ ...puzzle, start: coord, fixedPieces });
    if (tool === "pocket") return;
    if (tool === "erase") return onPuzzleChange({ ...puzzle, fixedPieces });

    const nextPiece: FixedPiece = {
      coord,
      kind: tool,
      gate: tool === "oneWayGate" ? { orientation: gateOrientation, passDirection: gatePassDirection } : undefined
    };
    onPuzzleChange({ ...puzzle, fixedPieces: [...fixedPieces, nextPiece] });
  }

  function startDrag(object: DraggableEditorObject | undefined, event: ReactPointerEvent) {
    if (!object) return;
    event.preventDefault();
    event.stopPropagation();
    setDragging({ ...object, x: event.clientX, y: event.clientY });
  }

  async function copyJson() {
    await navigator.clipboard.writeText(serializePuzzle(puzzle));
  }

  const cells: Coord[] = [];
  for (let row = -1; row <= puzzle.size; row += 1) {
    for (let col = -1; col <= puzzle.size; col += 1) {
      const coord = { row, col };
      if (isInside(coord, puzzle.size) || isPocketCoord(coord, puzzle.size)) cells.push(coord);
    }
  }

  function dragPreviewClass(): string {
    if (!dragging) return "";
    if (dragging.kind === "start") return "editor-drag-marker start";
    if (dragging.kind === "pocket") return "editor-drag-marker pocket";
    return editorPieceClass(dragging.piece);
  }

  function dragPreviewLabel(): string {
    if (!dragging) return "";
    if (dragging.kind === "start") return "S";
    if (dragging.kind === "pocket") return "P";
    return "";
  }

  return (
    <section className="editor-shell">
      <div className="editor-controls">
        <label>
          Title
          <input value={puzzle.title ?? ""} onChange={(event) => onPuzzleChange({ ...puzzle, title: event.target.value })} />
        </label>
        <label>
          Size
          <input type="number" min={4} max={12} value={puzzle.size} onChange={(event) => updateSize(Number(event.target.value))} />
        </label>
        <label>
          Launch
          <select value={puzzle.launchDirection} onChange={(event) => onPuzzleChange({ ...puzzle, launchDirection: event.target.value as PuzzleConfig["launchDirection"] })}>
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
            onChange={(event) => onPuzzleChange({ ...puzzle, inventory: { ...puzzle.inventory, slash: Number(event.target.value) } })}
          />
        </label>
        <label>
          \ Inventory
          <input
            type="number"
            min={0}
            value={puzzle.inventory.backslash}
            onChange={(event) => onPuzzleChange({ ...puzzle, inventory: { ...puzzle.inventory, backslash: Number(event.target.value) } })}
          />
        </label>
        <label>
          Gate Rail Shape
          <select value={gateOrientation} onChange={(event) => setGateOrientation(event.target.value as ReflectorOrientation)}>
            <option value="slash">/</option>
            <option value="backslash">\</option>
          </select>
        </label>
        <label>
          Gate Green Side
          <select value={gatePassDirection} onChange={(event) => setGatePassDirection(event.target.value as Direction)}>
            {gateOrientation === "slash" ? (
              <>
                <option value="E">N/E side</option>
                <option value="W">S/W side</option>
              </>
            ) : (
              <>
                <option value="N">N/W side</option>
                <option value="S">S/E side</option>
              </>
            )}
          </select>
        </label>
        <p className="editor-hint">A gate is green on the two-direction side the ball can pass through. Yellow approaches bounce as the selected rail shape.</p>
      </div>

      <div className="tool-palette">
        {fixedTools.map((item) => (
          <button key={item.tool} className={tool === item.tool ? "active" : ""} onClick={() => setTool(item.tool)}>
            {item.label}
          </button>
        ))}
      </div>

      <div className="editor-board expanded-editor-board" style={{ gridTemplateColumns: `repeat(${puzzle.size + 2}, 1fr)` }}>
        {cells.map((coord) => {
          const fixed = puzzle.fixedPieces.find((piece) => key(piece.coord) === key(coord));
          const isStart = key(coord) === key(puzzle.start);
          const isPocket = key(coord) === key(puzzle.pocket);
          const inside = isInside(coord, puzzle.size);
          const pocketSlot = isPocketCoord(coord, puzzle.size);
          const draggable = tool === "erase" ? undefined : draggableAt(puzzle, coord);
          return (
            <button
              key={key(coord)}
              className={`editor-cell ${inside ? "play-cell" : "pocket-slot"} ${isStart ? "start" : ""} ${isPocket ? "pocket" : ""}`}
              data-row={coord.row}
              data-col={coord.col}
              style={{ gridRow: coord.row + 2, gridColumn: coord.col + 2 }}
              onClick={() => applyTool(coord)}
              onPointerDown={(event) => startDrag(draggable, event)}
              disabled={!inside && !pocketSlot}
            >
              {inside ? (isStart ? "S" : fixed ? <span className={editorPieceClass(fixed)} /> : "") : isPocket ? "P" : ""}
            </button>
          );
        })}
      </div>

      {dragging && (
        <div className="editor-drag-preview" style={{ transform: `translate3d(${dragging.x - 26}px, ${dragging.y - 26}px, 0)` }}>
          <span className={dragPreviewClass()}>{dragPreviewLabel()}</span>
        </div>
      )}

      {errors.length > 0 && (
        <ul className="errors">
          {errors.map((error) => (
            <li key={error}>{error}</li>
          ))}
        </ul>
      )}

      <div className="editor-actions">
        <button onClick={() => onPuzzleChange({ ...puzzle, fixedPieces: [] })}>Clear Board</button>
        <button onClick={copyJson}>Copy JSON</button>
        <button className="primary" disabled={errors.length > 0} onClick={() => onPlayPuzzle(puzzle)}>
          Play Puzzle
        </button>
      </div>
    </section>
  );
}
