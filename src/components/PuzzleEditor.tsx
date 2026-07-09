import { useEffect, useMemo, useState, type PointerEvent as ReactPointerEvent } from "react";
import { isInside, isPocketCoord, launchDirectionForStart } from "../game/directions";
import { addInventoryItem, countedInventory, inventoryItemClass, inventoryItemKey, inventoryItemLabel, removeInventoryItem } from "../game/inventory";
import { parsePuzzleJson, serializePuzzle } from "../game/puzzleExport";
import { validatePuzzle } from "../game/puzzleValidation";
import type { Coord, Direction, FixedPiece, InventoryItem, PuzzleConfig, ReflectorOrientation } from "../game/types";
import { BackpackIcon } from "./Inventory";

type EditorTool = "start" | "pocket" | "fixedRail" | "glassRail" | "solidBlock" | "glassBlock" | "oneWayGate" | "erase";
type DraggableEditorObject = { kind: "start"; coord: Coord } | { kind: "pocket"; coord: Coord } | { kind: "fixed"; piece: FixedPiece };
type EditorDragState = DraggableEditorObject & {
  x: number;
  y: number;
  width: number;
  height: number;
};

type PuzzleEditorProps = {
  puzzle: PuzzleConfig;
  onPuzzleChange: (puzzle: PuzzleConfig) => void;
  onPlayPuzzle: (puzzle: PuzzleConfig) => void;
};

const fixedTools: Array<{ tool: EditorTool; label: string }> = [
  { tool: "start", label: "Start" },
  { tool: "pocket", label: "Pocket" },
  { tool: "fixedRail", label: "Rail" },
  { tool: "solidBlock", label: "Block" },
  { tool: "glassBlock", label: "Glass Block" },
  { tool: "glassRail", label: "Glass Rail" },
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

function railPieceKind(tool: "fixedRail" | "glassRail", orientation: ReflectorOrientation): FixedPiece["kind"] {
  if (tool === "fixedRail") return orientation === "slash" ? "fixedSlash" : "fixedBackslash";
  return orientation === "slash" ? "glassSlash" : "glassBackslash";
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
  if (object.kind === "start") return { ...puzzle, start: target, launchDirection: launchDirectionForStart(target, puzzle.size) };
  if (object.kind === "pocket") return { ...puzzle, pocket: target };
  return {
    ...puzzle,
    fixedPieces: puzzle.fixedPieces.map((piece) => (key(piece.coord) === key(object.piece.coord) ? { ...piece, coord: target } : piece))
  };
}

export function PuzzleEditor({ puzzle, onPuzzleChange, onPlayPuzzle }: PuzzleEditorProps) {
  const [tool, setTool] = useState<EditorTool>("fixedRail");
  const [railShape, setRailShape] = useState<ReflectorOrientation>("slash");
  const [gatePassDirection, setGatePassDirection] = useState<Direction>("E");
  const [dragging, setDragging] = useState<EditorDragState | undefined>();
  const [suppressClickKey, setSuppressClickKey] = useState<string | undefined>();
  const [jsonText, setJsonText] = useState(serializePuzzle(puzzle));
  const [jsonErrors, setJsonErrors] = useState<string[]>([]);
  const errors = useMemo(() => validatePuzzle(puzzle), [puzzle]);
  const currentInventoryItem = useMemo(() => editorToolInventoryItem(tool, railShape, gatePassDirection), [tool, railShape, gatePassDirection]);

  useEffect(() => {
    setJsonText(serializePuzzle(puzzle));
    setJsonErrors([]);
  }, [puzzle]);

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
      launchDirection: launchDirectionForStart({ row: clamped - 1, col: Math.min(puzzle.start.col, clamped - 1) }, clamped),
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
    if (tool === "start") return onPuzzleChange({ ...puzzle, start: coord, launchDirection: launchDirectionForStart(coord, puzzle.size), fixedPieces });
    if (tool === "pocket") return;
    if (tool === "erase") return onPuzzleChange({ ...puzzle, fixedPieces });

    const kind = tool === "fixedRail" || tool === "glassRail" ? railPieceKind(tool, railShape) : tool;
    const nextPiece: FixedPiece = {
      coord,
      kind,
      gate: tool === "oneWayGate" ? { orientation: railShape, passDirection: gatePassDirection } : undefined
    };
    onPuzzleChange({ ...puzzle, fixedPieces: [...fixedPieces, nextPiece] });
  }

  function startDrag(object: DraggableEditorObject | undefined, event: ReactPointerEvent) {
    if (!object) return;
    event.preventDefault();
    event.stopPropagation();
    const rect = event.currentTarget.getBoundingClientRect();
    setDragging({ ...object, x: event.clientX, y: event.clientY, width: rect.width, height: rect.height });
  }

  async function copyJson() {
    await navigator.clipboard.writeText(serializePuzzle(puzzle));
  }

  function loadJsonIntoEditor() {
    const parsed = parsePuzzleJson(jsonText);
    setJsonErrors(parsed.errors);
    if (parsed.puzzle && parsed.errors.length === 0) onPuzzleChange(parsed.puzzle);
  }

  function addSelectedToInventory() {
    if (!currentInventoryItem) return;
    onPuzzleChange({ ...puzzle, inventory: addInventoryItem(puzzle.inventory, currentInventoryItem) });
  }

  function removeFromInventory(item: InventoryItem) {
    onPuzzleChange({ ...puzzle, inventory: removeInventoryItem(puzzle.inventory, item) });
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

  function editorToolInventoryItem(toolName: EditorTool, orientation: ReflectorOrientation, passDirection: Direction): InventoryItem | undefined {
    if (toolName === "fixedRail") return { kind: orientation };
    if (toolName === "glassRail") return { kind: orientation === "slash" ? "glassSlash" : "glassBackslash" };
    if (toolName === "solidBlock") return { kind: "solidBlock" };
    if (toolName === "glassBlock") return { kind: "glassBlock" };
    if (toolName === "oneWayGate") return { kind: "oneWayGate", gate: { orientation, passDirection } };
    return undefined;
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
          Rail Shape
          <select
            value={railShape}
            onChange={(event) => {
              const nextShape = event.target.value as ReflectorOrientation;
              setRailShape(nextShape);
              setGatePassDirection(nextShape === "slash" ? "E" : "N");
            }}
          >
            <option value="slash">/</option>
            <option value="backslash">\</option>
          </select>
        </label>
        <label>
          Gate Green Side
          <select value={gatePassDirection} onChange={(event) => setGatePassDirection(event.target.value as Direction)}>
            {railShape === "slash" ? (
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
        <p className="editor-hint">Rail shape controls rails and gates. A gate is green on the two-direction side the ball can pass through.</p>
      </div>

      <div className="tool-palette">
        {fixedTools.map((item) => (
          <button key={item.tool} className={tool === item.tool ? "active" : ""} onClick={() => setTool(item.tool)}>
            {item.label}
          </button>
        ))}
      </div>

      <div className="editor-workbench">
        <section className="editor-backpack backpack-inventory" aria-label="Puzzle inventory">
          <button className="backpack-header" onClick={addSelectedToInventory} disabled={!currentInventoryItem} aria-label="Add selected piece to player inventory">
            <BackpackIcon />
          </button>
          <div className="backpack-items">
            {countedInventory(puzzle.inventory).map(({ item, count }) => (
              <button key={inventoryItemKey(item)} onClick={() => removeFromInventory(item)} aria-label={`Remove ${inventoryItemLabel(item)} from inventory`}>
                <span className="backpack-piece" aria-hidden="true">
                  <span className={inventoryItemClass(item)} />
                </span>
                {count > 1 && <strong>x{count}</strong>}
              </button>
            ))}
          </div>
        </section>

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

        <aside className="editor-json-panel" aria-label="Puzzle JSON">
          <div className="editor-json-heading">
            <h2>Puzzle JSON</h2>
            <div className="editor-json-buttons">
              <button onClick={copyJson}>Copy JSON</button>
              <button className="primary" onClick={loadJsonIntoEditor}>
                Load Into Editor
              </button>
            </div>
          </div>
          <textarea value={jsonText} onChange={(event) => setJsonText(event.target.value)} spellCheck={false} placeholder="Paste full puzzle JSON here." />
          {jsonErrors.length > 0 && (
            <ul className="errors">
              {jsonErrors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          )}
        </aside>
      </div>

      {dragging && (
        <div
          className="editor-drag-preview"
          style={{
            width: `${dragging.width}px`,
            height: `${dragging.height}px`,
            transform: `translate3d(${dragging.x - dragging.width / 2}px, ${dragging.y - dragging.height / 2}px, 0)`
          }}
        >
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
        <button className="primary" disabled={errors.length > 0} onClick={() => onPlayPuzzle(puzzle)}>
          Play Puzzle
        </button>
      </div>
    </section>
  );
}
