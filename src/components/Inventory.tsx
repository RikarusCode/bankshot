import type { Inventory as InventoryType, PlayerPiece } from "../game/types";

type InventoryProps = {
  inventory: InventoryType;
  playerPieces: PlayerPiece[];
  selectedPlacement?: "slash" | "backslash";
  locked?: boolean;
  onSelect: (kind: "slash" | "backslash") => void;
};

export function Inventory({ inventory, playerPieces, selectedPlacement, locked = false, onSelect }: InventoryProps) {
  const usedSlash = playerPieces.filter((piece) => piece.kind === "slash").length;
  const usedBackslash = playerPieces.filter((piece) => piece.kind === "backslash").length;
  const remaining = {
    slash: inventory.slash - usedSlash,
    backslash: inventory.backslash - usedBackslash
  };

  return (
    <section className="inventory" aria-label="Bumper inventory">
      <button
        className={selectedPlacement === "slash" ? "active" : ""}
        disabled={locked || remaining.slash <= 0}
        draggable={!locked && remaining.slash > 0}
        onDragStart={(event) => {
          event.dataTransfer.effectAllowed = "copy";
          event.dataTransfer.setData("text/plain", "new:slash");
        }}
        onClick={() => onSelect("slash")}
      >
        <span className="inventory-piece slash-wall" aria-hidden="true" />
        <strong>{remaining.slash}</strong>
      </button>
      <button
        className={selectedPlacement === "backslash" ? "active" : ""}
        disabled={locked || remaining.backslash <= 0}
        draggable={!locked && remaining.backslash > 0}
        onDragStart={(event) => {
          event.dataTransfer.effectAllowed = "copy";
          event.dataTransfer.setData("text/plain", "new:backslash");
        }}
        onClick={() => onSelect("backslash")}
      >
        <span className="inventory-piece backslash-wall" aria-hidden="true" />
        <strong>{remaining.backslash}</strong>
      </button>
    </section>
  );
}
