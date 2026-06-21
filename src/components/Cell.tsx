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
  onDragStart: (piece: PlayerPiece) => void;
  onDropPiece: (payload: string) => void;
};

function pieceLabel(kind: PieceKind): string {
  switch (kind) {
    case "slash":
    case "fixedSlash":
    case "crackedSlash":
      return "";
    case "backslash":
    case "fixedBackslash":
    case "crackedBackslash":
      return "";
    case "solidBlock":
      return "";
    case "crackedBlock":
      return "";
    case "oneWayGate":
      return "";
  }
}

function pieceClass(kind: PieceKind): string {
  const orientation = kind === "slash" || kind === "fixedSlash" || kind === "crackedSlash" ? " slash-wall" : kind === "backslash" || kind === "fixedBackslash" || kind === "crackedBackslash" ? " backslash-wall" : "";
  if (kind === "slash" || kind === "backslash") return `piece player-piece${orientation}`;
  if (kind.startsWith("cracked")) return `piece fixed-piece cracked${orientation}`;
  if (kind === "solidBlock") return "piece fixed-piece block";
  if (kind === "oneWayGate") return "piece fixed-piece gate slash-wall";
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
  onDragStart,
  onDropPiece
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
      style={{ gridRow: coord.row + 1, gridColumn: coord.col + 1 }}
      onClick={onClick}
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        onDropPiece(event.dataTransfer.getData("text/plain"));
      }}
      aria-label={`Cell ${coord.row + 1}, ${coord.col + 1}`}
    >
      {isPocket && <span className="pocket" />}
      {kind && (
        <span
          className={pieceClass(kind)}
          draggable={Boolean(playerPiece)}
          onDragStart={(event) => {
            if (!playerPiece) return;
            event.dataTransfer.effectAllowed = "move";
            event.dataTransfer.setData("text/plain", playerPiece.id);
            onDragStart(playerPiece);
          }}
          title={kind}
        >
          {pieceLabel(kind)}
        </span>
      )}
    </button>
  );
}
