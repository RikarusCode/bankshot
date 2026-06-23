import type { Direction, FixedPiece, GateConfig, Inventory, InventoryItem, InventoryPieceKind, PlayerPiece, ReflectorOrientation } from "./types";

export const INVENTORY_ORDER: InventoryPieceKind[] = ["slash", "backslash", "solidBlock", "glassBlock", "glassSlash", "glassBackslash", "oneWayGate"];

export function defaultGate(orientation: ReflectorOrientation = "slash"): GateConfig {
  return { orientation, passDirection: orientation === "slash" ? "E" : "N" };
}

export function inventoryItemKey(item: InventoryItem): string {
  if (item.kind !== "oneWayGate") return item.kind;
  const gate = item.gate ?? defaultGate();
  return `${item.kind}:${gate.orientation}:${gate.passDirection}`;
}

export function inventoryItemLabel(item: InventoryItem): string {
  if (item.kind === "slash") return "/ rail";
  if (item.kind === "backslash") return "\\ rail";
  if (item.kind === "solidBlock") return "Block";
  if (item.kind === "glassBlock") return "Glass block";
  if (item.kind === "glassSlash") return "Glass / rail";
  if (item.kind === "glassBackslash") return "Glass \\ rail";
  return "Gate";
}

export function inventoryItemClass(item: InventoryItem): string {
  if (item.kind === "slash") return "piece player-piece slash-wall";
  if (item.kind === "backslash") return "piece player-piece backslash-wall";
  if (item.kind === "solidBlock") return "piece fixed-piece block";
  if (item.kind === "glassBlock") return "piece fixed-piece glass";
  if (item.kind === "glassSlash") return "piece fixed-piece glass slash-wall";
  if (item.kind === "glassBackslash") return "piece fixed-piece glass backslash-wall";
  const gate = item.gate ?? defaultGate();
  return `piece fixed-piece gate ${gate.orientation === "slash" ? "gate-slash" : "gate-backslash"} ${gateSideClass(gate)}`;
}

function gateSideClass(gate: GateConfig): string {
  if (gate.orientation === "slash") return gate.passDirection === "N" || gate.passDirection === "E" ? "gate-pass-ne" : "gate-pass-sw";
  return gate.passDirection === "N" || gate.passDirection === "W" ? "gate-pass-nw" : "gate-pass-se";
}

export function normalizeInventory(inventory: unknown): Inventory {
  if (Array.isArray(inventory)) {
    return inventory
      .filter((item): item is InventoryItem => Boolean(item) && typeof item === "object" && "kind" in item)
      .flatMap((item) => normalizeInventoryItem(item as InventoryItem))
      .sort(compareInventoryItems);
  }

  if (inventory && typeof inventory === "object") {
    const legacy = inventory as { slash?: unknown; backslash?: unknown };
    const items: Inventory = [];
    const slash = typeof legacy.slash === "number" && Number.isInteger(legacy.slash) ? legacy.slash : 0;
    const backslash = typeof legacy.backslash === "number" && Number.isInteger(legacy.backslash) ? legacy.backslash : 0;
    for (let index = 0; index < slash; index += 1) items.push({ kind: "slash" });
    for (let index = 0; index < backslash; index += 1) items.push({ kind: "backslash" });
    return items;
  }

  return [];
}

export function normalizeInventoryItem(item: InventoryItem): Inventory {
  if (!INVENTORY_ORDER.includes(item.kind)) return [];
  if (item.kind === "oneWayGate") return [{ kind: item.kind, gate: normalizeGate(item.gate) }];
  return [{ kind: item.kind }];
}

function normalizeGate(gate?: GateConfig): GateConfig {
  if (!gate) return defaultGate();
  if ((gate.orientation === "slash" || gate.orientation === "backslash") && isDirection(gate.passDirection)) return gate;
  return defaultGate(gate.orientation === "backslash" ? "backslash" : "slash");
}

function isDirection(value: unknown): value is Direction {
  return value === "N" || value === "E" || value === "S" || value === "W";
}

export function compareInventoryItems(a: InventoryItem, b: InventoryItem): number {
  const order = INVENTORY_ORDER.indexOf(a.kind) - INVENTORY_ORDER.indexOf(b.kind);
  if (order !== 0) return order;
  return inventoryItemKey(a).localeCompare(inventoryItemKey(b));
}

export function addInventoryItem(inventory: unknown, item: InventoryItem): Inventory {
  return [...normalizeInventory(inventory), ...normalizeInventoryItem(item)].sort(compareInventoryItems);
}

export function removeInventoryItem(inventory: unknown, item: InventoryItem): Inventory {
  const key = inventoryItemKey(item);
  let removed = false;
  return normalizeInventory(inventory).filter((current) => {
    if (!removed && inventoryItemKey(current) === key) {
      removed = true;
      return false;
    }
    return true;
  });
}

export function countedInventory(inventory: unknown): Array<{ item: InventoryItem; count: number }> {
  const counts = new Map<string, { item: InventoryItem; count: number }>();
  for (const item of normalizeInventory(inventory)) {
    const key = inventoryItemKey(item);
    const current = counts.get(key);
    if (current) current.count += 1;
    else counts.set(key, { item, count: 1 });
  }
  return [...counts.values()].sort((a, b) => compareInventoryItems(a.item, b.item));
}

export function remainingInventory(inventory: unknown, playerPieces: PlayerPiece[]): Inventory {
  let remaining = normalizeInventory(inventory);
  for (const piece of playerPieces) {
    remaining = removeInventoryItem(remaining, { kind: piece.kind, gate: piece.gate });
  }
  return remaining;
}

export function playerPieceToInventoryItem(piece: PlayerPiece): InventoryItem {
  return { kind: piece.kind, gate: piece.gate };
}

export function fixedPieceToInventoryItem(piece: FixedPiece): InventoryItem | undefined {
  if (piece.kind === "fixedSlash") return { kind: "slash" };
  if (piece.kind === "fixedBackslash") return { kind: "backslash" };
  if (piece.kind === "solidBlock") return { kind: "solidBlock" };
  if (piece.kind === "glassBlock") return { kind: "glassBlock" };
  if (piece.kind === "glassSlash") return { kind: "glassSlash" };
  if (piece.kind === "glassBackslash") return { kind: "glassBackslash" };
  if (piece.kind === "oneWayGate") return { kind: "oneWayGate", gate: piece.gate ?? defaultGate() };
  return undefined;
}
