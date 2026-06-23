import type { PointerEvent as ReactPointerEvent } from "react";
import type { Inventory as InventoryType, PlayerPiece } from "../game/types";

type InventoryProps = {
  inventory: InventoryType;
  playerPieces: PlayerPiece[];
  selectedPlacement?: "slash" | "backslash";
  locked?: boolean;
  onSelect: (kind: "slash" | "backslash") => void;
  onStartDrag: (kind: "slash" | "backslash", event: ReactPointerEvent) => void;
};

export function Inventory({ inventory, playerPieces, selectedPlacement, locked = false, onSelect, onStartDrag }: InventoryProps) {
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
        onPointerDown={(event) => onStartDrag("slash", event)}
        onClick={() => onSelect("slash")}
      >
        <span className="inventory-piece slash-wall" aria-hidden="true" />
        <strong>{remaining.slash}</strong>
      </button>
      <button
        className={selectedPlacement === "backslash" ? "active" : ""}
        disabled={locked || remaining.backslash <= 0}
        onPointerDown={(event) => onStartDrag("backslash", event)}
        onClick={() => onSelect("backslash")}
      >
        <span className="inventory-piece backslash-wall" aria-hidden="true" />
        <strong>{remaining.backslash}</strong>
      </button>
    </section>
  );
}
