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
  return (
    <svg className="backpack-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8.2 7.2V5.9C8.2 3.7 9.9 2 12 2s3.8 1.7 3.8 3.9v1.3h1.8c1.5 0 2.7 1.2 2.7 2.7v9.3c0 1.6-1.2 2.8-2.8 2.8h-11c-1.6 0-2.8-1.2-2.8-2.8V9.9c0-1.5 1.2-2.7 2.7-2.7h1.8Zm2.1 0h3.4V5.9c0-1-.7-1.7-1.7-1.7s-1.7.7-1.7 1.7v1.3Zm-2.1 4.1c-.5 0-.9.4-.9.9v6.1c0 .5.4.9.9.9h7.6c.5 0 .9-.4.9-.9v-6.1c0-.5-.4-.9-.9-.9H8.2Z" />
    </svg>
  );
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
