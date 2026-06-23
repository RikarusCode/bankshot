import type { PointerEvent as ReactPointerEvent } from "react";
import type { Coord, FixedPiece, PieceKind, PlayerPiece } from "../game/types";

type CellProps = {
  coord: Coord;
  fixedPiece?: FixedPiece;
  playerPiece?: PlayerPiece;
  isPocket: boolean;
  pocketEdge?: "top" | "right" | "bottom" | "left";
  isAvailable: boolean;
  selected: boolean;
  onClick: () => void;
  onStartDrag: (piece: PlayerPiece, event: ReactPointerEvent) => void;
};

function pieceLabel(kind: PieceKind): string {
  switch (kind) {
    case "slash":
    case "fixedSlash":
    case "glassSlash":
      return "";
    case "backslash":
    case "fixedBackslash":
    case "glassBackslash":
      return "";
    case "solidBlock":
      return "";
    case "glassBlock":
      return "";
    case "oneWayGate":
      return "";
  }
}

function gateSideClass(fixedPiece?: FixedPiece): string {
  if (!fixedPiece?.gate) return " gate-slash gate-pass-ne";
  const orientationClass = fixedPiece.gate.orientation === "slash" ? "gate-slash" : "gate-backslash";
  const passDirection = fixedPiece.gate.passDirection;
  let sideClass = "gate-pass-ne";
  if (fixedPiece.gate.orientation === "slash") {
    sideClass = passDirection === "N" || passDirection === "E" ? "gate-pass-ne" : "gate-pass-sw";
  } else {
    sideClass = passDirection === "N" || passDirection === "W" ? "gate-pass-nw" : "gate-pass-se";
  }
  return ` ${orientationClass} ${sideClass}`;
}

function pieceClass(kind: PieceKind, fixedPiece?: FixedPiece): string {
  const orientation = kind === "slash" || kind === "fixedSlash" || kind === "glassSlash" ? " slash-wall" : kind === "backslash" || kind === "fixedBackslash" || kind === "glassBackslash" ? " backslash-wall" : "";
  if (kind === "slash" || kind === "backslash") return `piece player-piece${orientation}`;
  if (kind.startsWith("glass")) return `piece fixed-piece glass${orientation}`;
  if (kind === "solidBlock") return "piece fixed-piece block";
  if (kind === "oneWayGate") return `piece fixed-piece gate${gateSideClass(fixedPiece)}`;
  return `piece fixed-piece${orientation}`;
}

export function Cell({
  coord,
  fixedPiece,
  playerPiece,
  isPocket,
  pocketEdge,
  isAvailable,
  selected,
  onClick,
  onStartDrag
}: CellProps) {
  const kind = playerPiece?.kind ?? fixedPiece?.kind;

  return (
    <button
      className={[
        "cell",
        isPocket ? "pocket-cell" : "",
        pocketEdge ? `pocket-${pocketEdge}` : "",
        isAvailable ? "available" : "",
        selected ? "selected" : ""
      ].join(" ")}
      data-row={coord.row}
      data-col={coord.col}
      style={{ gridRow: coord.row + 1, gridColumn: coord.col + 1 }}
      onClick={onClick}
      aria-label={`Cell ${coord.row + 1}, ${coord.col + 1}`}
    >
      {kind && (
        <span
          className={pieceClass(kind, fixedPiece)}
          onPointerDown={(event) => {
            if (!playerPiece) return;
            onStartDrag(playerPiece, event);
          }}
        >
          {pieceLabel(kind)}
        </span>
      )}
    </button>
  );
}
