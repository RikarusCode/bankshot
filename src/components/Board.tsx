import { useEffect, useRef, useState, type CSSProperties } from "react";
import { coordKey, sameCoord } from "../game/directions";
import { isCellAvailable } from "../game/puzzleValidation";
import type { Coord, Direction, FixedPiece, PlayerPiece, PuzzleConfig } from "../game/types";
import { Cell } from "./Cell";

type BoardProps = {
  puzzle: PuzzleConfig;
  playerPieces: PlayerPiece[];
  selectedPieceId?: string;
  selectedPlacement?: "slash" | "backslash";
  locked?: boolean;
  ball?: { coord: Coord; direction: Direction };
  onCellClick: (coord: Coord) => void;
  onMovePiece: (pieceId: string, coord: Coord) => void;
  onDropNewPiece: (kind: "slash" | "backslash", coord: Coord) => void;
  onDragPlayerPiece: (piece: PlayerPiece) => void;
};

export function Board({
  puzzle,
  playerPieces,
  selectedPieceId,
  selectedPlacement,
  locked = false,
  ball,
  onCellClick,
  onMovePiece,
  onDropNewPiece,
  onDragPlayerPiece
}: BoardProps) {
  const boardRef = useRef<HTMLDivElement>(null);
  const [boardSize, setBoardSize] = useState(0);
  const fixedByCell = new Map<string, FixedPiece>(puzzle.fixedPieces.map((piece) => [coordKey(piece.coord), piece]));
  const playerByCell = new Map<string, PlayerPiece>(playerPieces.map((piece) => [coordKey(piece.coord), piece]));
  const cells: Coord[] = [];

  for (let row = 0; row < puzzle.size; row += 1) {
    for (let col = 0; col < puzzle.size; col += 1) {
      cells.push({ row, col });
    }
  }

  useEffect(() => {
    const board = boardRef.current;
    if (!board) return;

    const updateSize = () => setBoardSize(board.getBoundingClientRect().width);
    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(board);
    return () => observer.disconnect();
  }, []);

  function pocketEdge(coord: Coord): "top" | "right" | "bottom" | "left" | undefined {
    if (!sameCoord(coord, puzzle.pocket)) return undefined;
    if (coord.row === 0) return "top";
    if (coord.row === puzzle.size - 1) return "bottom";
    if (coord.col === 0) return "left";
    if (coord.col === puzzle.size - 1) return "right";
    return undefined;
  }

  return (
    <div className="table-wrap">
      <div className="table-rail">
        <div ref={boardRef} className="board" style={{ gridTemplateColumns: `repeat(${puzzle.size}, 1fr)` }}>
          {cells.map((coord) => {
            const key = coordKey(coord);
            const playerPiece = playerByCell.get(key);
            const fixedPiece = fixedByCell.get(key);
            const movingId = selectedPieceId;
            const available = !locked && Boolean(selectedPlacement || selectedPieceId) && isCellAvailable(puzzle, playerPieces, coord.row, coord.col, movingId);

            return (
              <Cell
                key={key}
                coord={coord}
                fixedPiece={fixedPiece}
                playerPiece={playerPiece}
                isPocket={sameCoord(coord, puzzle.pocket)}
                pocketEdge={pocketEdge(coord)}
                isAvailable={available}
                selected={Boolean(playerPiece && playerPiece.id === selectedPieceId)}
                onClick={() => onCellClick(coord)}
                onDragStart={onDragPlayerPiece}
                onDropPiece={(payload) => {
                  if (payload.startsWith("new:")) {
                    onDropNewPiece(payload.replace("new:", "") as "slash" | "backslash", coord);
                    return;
                  }
                  if (payload) onMovePiece(payload, coord);
                  else if (selectedPieceId) onMovePiece(selectedPieceId, coord);
                }}
              />
            );
          })}
          {ball && (
            <div
              className={`eight-ball dir-${ball.direction}`}
              style={{
                "--ball-x": `${((ball.coord.col + 0.5) / puzzle.size) * boardSize}px`,
                "--ball-y": `${((ball.coord.row + 0.5) / puzzle.size) * boardSize}px`,
                "--cell-size": `${100 / puzzle.size}%`
              } as CSSProperties}
            >
              8
            </div>
          )}
        </div>
      </div>
      {locked && <div className="cue-ball" aria-hidden="true" />}
    </div>
  );
}
