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
  | "crackedBlock"
  | "crackedSlash"
  | "crackedBackslash"
  | "oneWayGate";

export type Inventory = {
  slash: number;
  backslash: number;
};

export type GateConfig = {
  orientation: ReflectorOrientation;
  passDirection: Direction;
};

export type FixedPiece = {
  coord: Coord;
  kind: Exclude<PieceKind, "slash" | "backslash">;
  gate?: GateConfig;
};

export type PlayerPiece = {
  id: string;
  coord: Coord;
  kind: "slash" | "backslash";
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

export type Mode = "daily" | "custom" | "editor";

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
