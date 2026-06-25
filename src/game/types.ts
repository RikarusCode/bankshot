export type Direction = "N" | "E" | "S" | "W";

export type Coord = {
  row: number;
  col: number;
};

export type ReflectorOrientation = "slash" | "backslash";

export type PieceKind =
  | "slash"
  | "backslash"
  | "fixedSlash"
  | "fixedBackslash"
  | "solidBlock"
  | "glassBlock"
  | "glassSlash"
  | "glassBackslash"
  | "oneWayGate";

export type GateConfig = {
  orientation: ReflectorOrientation;
  passDirection: Direction;
};

export type InventoryPieceKind = "slash" | "backslash" | "solidBlock" | "glassBlock" | "glassSlash" | "glassBackslash" | "oneWayGate";

export type InventoryItem = {
  kind: InventoryPieceKind;
  gate?: GateConfig;
};

export type Inventory = InventoryItem[];

export type FixedPiece = {
  coord: Coord;
  kind: Exclude<PieceKind, "slash" | "backslash">;
  gate?: GateConfig;
};

export type PlayerPiece = {
  id: string;
  coord: Coord;
  kind: InventoryPieceKind;
  gate?: GateConfig;
};

export type PuzzleConfig = {
  schemaVersion: 1;
  id: string;
  number?: number;
  date?: string;
  title?: string;
  size: number;
  start: Coord;
  launchDirection: Direction;
  pocket: Coord;
  inventory: Inventory;
  fixedPieces: FixedPiece[];
};

export type SimulationEvent =
  | "move"
  | "bounce"
  | "break"
  | "pocket"
  | "rail"
  | "loop";

export type PathStep = {
  position: Coord;
  direction: Direction;
  event: SimulationEvent;
  target?: Coord;
  pieceKind?: PieceKind;
};

export type SimulationStatus = "win" | "loop";

export type SimulationResult = {
  status: SimulationStatus;
  path: PathStep[];
  bounces: number;
  reason?: "loopGuard";
};

export type Mode = "daily" | "archive" | "custom" | "editor";

export type ArchiveEntry = {
  date: string;
  number: number;
  status: "available" | "locked" | "missing";
  title?: string;
  puzzle?: PuzzleConfig;
};

export type DailyProgress = {
  puzzleId: string;
  date: string;
  attempts: number;
  solved: boolean;
  solvedAttempts?: number;
  shotHistory: SimulationStatus[];
};

export type StreakState = {
  current: number;
  lastSolvedDate?: string;
};

export type SolveRecord = {
  date: string;
  attempts: number;
  solvedOnDate: boolean;
};

export type ServerProgress = {
  today: string;
  deviceReady: boolean;
  solvedDates: string[];
  solves?: SolveRecord[];
  solvedToday: boolean;
  todayAttempts?: number;
  streak: StreakState;
};
