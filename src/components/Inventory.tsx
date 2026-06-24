import type { PointerEvent as ReactPointerEvent } from "react";
import { countedInventory, inventoryItemClass, inventoryItemKey, inventoryItemLabel, remainingInventory } from "../game/inventory";
import type { Inventory as InventoryType, InventoryItem, PlayerPiece } from "../game/types";

type InventoryProps = {
  inventory: InventoryType;
  playerPieces: PlayerPiece[];
  selectedItem?: InventoryItem;
  locked?: boolean;
  onSelect: (item: InventoryItem) => void;
  onStartDrag: (item: InventoryItem, event: ReactPointerEvent) => void;
};

export function BackpackIcon() {
  return <img className="backpack-icon" src="/assets/backpack-inventory.png" alt="" aria-hidden="true" draggable={false} />;
}

export function Inventory({ inventory, playerPieces, selectedItem, locked = false, onSelect, onStartDrag }: InventoryProps) {
  const remaining = countedInventory(remainingInventory(inventory, playerPieces));
  const selectedKey = selectedItem ? inventoryItemKey(selectedItem) : "";

  return (
    <section className="inventory backpack-inventory" aria-label="Player inventory" data-inventory-drop="true">
      <div className="backpack-header">
        <BackpackIcon />
      </div>
      <div className="backpack-items">
        {remaining.length === 0 && <span className="backpack-empty">Empty</span>}
        {remaining.map(({ item, count }) => {
          const key = inventoryItemKey(item);
          return (
            <button
              key={key}
              className={selectedKey === key ? "active" : ""}
              disabled={locked}
              onPointerDown={(event) => onStartDrag(item, event)}
              onClick={() => onSelect(item)}
              aria-label={`Place ${inventoryItemLabel(item)}`}
            >
              <span className="backpack-piece" aria-hidden="true">
                <span className={inventoryItemClass(item)} />
              </span>
              {count > 1 && <strong>x{count}</strong>}
            </button>
          );
        })}
      </div>
    </section>
  );
}
