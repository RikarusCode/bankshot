import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import { buildBallAnimationSegments, directionDelta, interpolateBallSegment } from "../game/animationPath";
import { coordKey, pocketEdge } from "../game/directions";
import { playBounce, playCueStrike, playGlassBreak, playGlassTick, playPocket, playRailBounce, playSolidBounce, startRoll, stopRoll } from "../game/sound";
import type { Coord, FixedPiece, PlayerPiece, PuzzleConfig, SimulationResult } from "../game/types";
import { Cell } from "./Cell";

const BALL_SPEED_CELLS_PER_SECOND = 5.2;
const CUE_ANIMATION_MS = 360;
const BALL_SINK_MS = 520;

type BoardProps = {
  puzzle: PuzzleConfig;
  playerPieces: PlayerPiece[];
  selectedPieceId?: string;
  locked?: boolean;
  shot?: { id: number; result: SimulationResult };
  muted: boolean;
  onShotComplete: (result: SimulationResult) => void;
  onCellClick: (coord: Coord) => void;
  onStartPieceDrag: (piece: PlayerPiece, event: ReactPointerEvent) => void;
};

function pocketDropPoint(position: Coord, size: number): Coord {
  if (position.row < 0) return { row: -0.5, col: position.col };
  if (position.row >= size) return { row: size - 0.5, col: position.col };
  if (position.col < 0) return { row: position.row, col: -0.5 };
  if (position.col >= size) return { row: position.row, col: size - 0.5 };
  return position;
}

export function Board({
  puzzle,
  playerPieces,
  selectedPieceId,
  locked = false,
  shot,
  muted,
  onShotComplete,
  onCellClick,
  onStartPieceDrag
}: BoardProps) {
  const boardRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const ballRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | undefined>(undefined);
  const cueTimeoutRef = useRef<number | undefined>(undefined);
  const sinkTimeoutRef = useRef<number | undefined>(undefined);
  const mutedRef = useRef(muted);
  const [boardSize, setBoardSize] = useState(0);
  const [hiddenGlassKeys, setHiddenGlassKeys] = useState<Set<string>>(() => new Set());
  const [sinking, setSinking] = useState(false);
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

  useEffect(() => {
    setHiddenGlassKeys(new Set());
    setSinking(false);
  }, [shot?.id, puzzle.id]);

  useEffect(() => {
    mutedRef.current = muted;
    if (muted) stopRoll();
  }, [muted]);

  function ballMetrics() {
    const board = boardRef.current;
    const ball = ballRef.current;
    if (!board || !ball) return undefined;
    const width = board.getBoundingClientRect().width;
    const ballSize = Math.min((width / puzzle.size) * 0.36, 34);
    return { width, ballSize };
  }

  function boardOffsetInRail() {
    const board = boardRef.current;
    if (!board) return { x: 0, y: 0 };
    return { x: board.offsetLeft, y: board.offsetTop };
  }

  function applyBallStyle(coord: Coord, spinDegrees: number, scale: number, opacity: number, blur: number) {
    const ball = ballRef.current;
    const metrics = ballMetrics();
    if (!ball || !metrics) return;
    const x = ((coord.col + 0.5) / puzzle.size) * metrics.width - metrics.ballSize / 2;
    const y = ((coord.row + 0.5) / puzzle.size) * metrics.width - metrics.ballSize / 2;
    ball.style.width = `${metrics.ballSize}px`;
    ball.style.opacity = `${opacity}`;
    ball.style.filter = blur > 0 ? `blur(${blur}px)` : "";
    ball.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(${spinDegrees}deg) scale(${scale})`;
  }

  function setBallTransform(coord: Coord, spinDegrees = 0) {
    const ball = ballRef.current;
    if (ball) ball.style.transition = "";
    applyBallStyle(coord, spinDegrees, 1, 1, 0);
  }

  function sinkBall(coord: Coord, spinDegrees: number) {
    const ball = ballRef.current;
    if (!ball) return;
    const dropCoord = pocketDropPoint(coord, puzzle.size);
    ball.style.transition = `transform ${BALL_SINK_MS}ms cubic-bezier(0.24, 0.76, 0.22, 1), opacity ${BALL_SINK_MS}ms ease, filter ${BALL_SINK_MS}ms ease`;
    window.requestAnimationFrame(() => applyBallStyle(dropCoord, spinDegrees + 96, 0.08, 0, 1.2));
  }

  function cueStyle(): CSSProperties {
    const metrics = ballMetrics();
    if (!metrics) return {};
    const cell = metrics.width / puzzle.size;
    const offset = boardOffsetInRail();
    const centerX = ((puzzle.start.col + 0.5) / puzzle.size) * metrics.width;
    const centerY = ((puzzle.start.row + 0.5) / puzzle.size) * metrics.width;
    const delta = directionDelta(puzzle.launchDirection);
    const cueBallSize = Math.min(cell * 0.28, 18);
    const cueStartDistance = Math.max(cell * 1.55, metrics.ballSize + cueBallSize + 28);
    const contactDistance = metrics.ballSize / 2 + cueBallSize / 2;
    const cueContactTravel = Math.max(0, cueStartDistance - contactDistance);
    const startX = centerX - delta.col * cueStartDistance;
    const startY = centerY - delta.row * cueStartDistance;
    const angle = Math.atan2(delta.row, delta.col) * (180 / Math.PI);
    return {
      "--cue-x": `${offset.x + startX}px`,
      "--cue-y": `${offset.y + startY}px`,
      "--cue-angle": `${angle}deg`,
      "--cue-contact": `${cueContactTravel}px`,
      "--cue-stick-start": `${cueContactTravel + 112}px`,
      "--cue-stick-strike": `10px`,
      "--cell-size": `${cell}px`
    } as CSSProperties;
  }

  useEffect(() => {
    if (!shot) {
      if (animationFrameRef.current !== undefined) window.cancelAnimationFrame(animationFrameRef.current);
      if (cueTimeoutRef.current !== undefined) window.clearTimeout(cueTimeoutRef.current);
      if (sinkTimeoutRef.current !== undefined) window.clearTimeout(sinkTimeoutRef.current);
      stopRoll();
      setSinking(false);
      setBallTransform(puzzle.start, 0);
      return;
    }

    const segments = buildBallAnimationSegments(shot.result.path, puzzle.size).map((segment) => {
      const duration = Math.max(42, (segment.distance / BALL_SPEED_CELLS_PER_SECOND) * 1000 + (segment.from.holdMs ?? 0));
      return { ...segment, duration };
    });
    if (segments.length === 0) return;
    const metrics = ballMetrics();
    if (!metrics) return;

    let segmentIndex = 0;
    let segmentStartedAt: number | undefined;
    let cumulativeDistance = 0;
    const soundedEvents = new Set<number>();
    setBallTransform(segments[0].from.coord, 0);

    const animate = (time: number) => {
      const segment = segments[segmentIndex];
      if (!segment) {
        const finalCoord = segments[segments.length - 1].to.coord;
        setBallTransform(finalCoord, cumulativeDistance * 210);
        stopRoll();
        if (shot.result.status === "win") {
          setSinking(true);
          sinkBall(finalCoord, cumulativeDistance * 210);
          playPocket(mutedRef.current);
          sinkTimeoutRef.current = window.setTimeout(() => onShotComplete(shot.result), BALL_SINK_MS);
        } else {
          onShotComplete(shot.result);
        }
        return;
      }

      if (segmentStartedAt === undefined) segmentStartedAt = time;
      const elapsed = time - segmentStartedAt;
      const progress = Math.min(1, elapsed / segment.duration);
      const eased = progress;
      const coord = interpolateBallSegment(segment, eased);
      setBallTransform(coord, (cumulativeDistance + segment.distance * eased) * 210);

      if (progress >= 1) {
        if (!soundedEvents.has(segmentIndex)) {
          soundedEvents.add(segmentIndex);
          if (segment.to.event === "rail") playRailBounce(mutedRef.current);
          if (segment.to.event === "bounce") {
            if (segment.to.pieceKind === "solidBlock") playSolidBounce(mutedRef.current);
            else if (segment.to.pieceKind === "glassBlock" || segment.to.pieceKind === "glassSlash" || segment.to.pieceKind === "glassBackslash") playGlassTick(mutedRef.current);
            else playBounce(mutedRef.current);
          }
          if (segment.to.event === "break") {
            playGlassBreak(mutedRef.current);
            if ((segment.to.pieceKind === "glassSlash" || segment.to.pieceKind === "glassBackslash") && segment.to.pieceCoord) {
              setHiddenGlassKeys((current) => new Set(current).add(coordKey(segment.to.pieceCoord!)));
            }
            if (segment.to.pieceKind === "glassBlock" && segment.to.pieceCoord) {
              setHiddenGlassKeys((current) => new Set(current).add(coordKey(segment.to.pieceCoord!)));
            }
          }
        }
        cumulativeDistance += segment.distance;
        segmentIndex += 1;
        segmentStartedAt = undefined;
      }

      animationFrameRef.current = window.requestAnimationFrame(animate);
    };

    cueTimeoutRef.current = window.setTimeout(() => {
      playCueStrike(mutedRef.current);
      startRoll(mutedRef.current);
      animationFrameRef.current = window.requestAnimationFrame(animate);
    }, CUE_ANIMATION_MS);

    return () => {
      if (animationFrameRef.current !== undefined) window.cancelAnimationFrame(animationFrameRef.current);
      if (cueTimeoutRef.current !== undefined) window.clearTimeout(cueTimeoutRef.current);
      if (sinkTimeoutRef.current !== undefined) window.clearTimeout(sinkTimeoutRef.current);
      stopRoll();
    };
  }, [shot?.id, boardSize, puzzle.id]);

  const currentPocketEdge = pocketEdge(puzzle.pocket, puzzle.size) ?? "bottom";
  const pocketOffsetPixels =
    currentPocketEdge === "top" || currentPocketEdge === "bottom"
      ? ((puzzle.pocket.col + 0.5) / puzzle.size) * boardSize
      : ((puzzle.pocket.row + 0.5) / puzzle.size) * boardSize;
  const boardOffset = boardOffsetInRail();
  const pocketStyle =
    currentPocketEdge === "top" || currentPocketEdge === "bottom"
      ? ({
          left: `${boardOffset.x + pocketOffsetPixels}px`,
          top: `${boardOffset.y + (currentPocketEdge === "bottom" ? boardSize : 0)}px`
        } as CSSProperties)
      : ({
          left: `${boardOffset.x + (currentPocketEdge === "right" ? boardSize : 0)}px`,
          top: `${boardOffset.y + pocketOffsetPixels}px`
      } as CSSProperties);
  const railStyle = {
    "--board-x": `${boardOffset.x}px`,
    "--board-y": `${boardOffset.y}px`,
    "--board-size": `${boardSize}px`
  } as CSSProperties;
  const railDiamonds = [0, 1, 2, 3];

  return (
    <div className="table-wrap">
      <div ref={railRef} className="table-rail" style={railStyle}>
        <div className="rail-detail rail-detail-top">
          {railDiamonds.map((index) => (
            <span key={`top-${index}`} />
          ))}
        </div>
        <div className="rail-detail rail-detail-bottom">
          {railDiamonds.map((index) => (
            <span key={`bottom-${index}`} />
          ))}
        </div>
        <div className="rail-detail rail-detail-left">
          {railDiamonds.map((index) => (
            <span key={`left-${index}`} />
          ))}
        </div>
        <div className="rail-detail rail-detail-right">
          {railDiamonds.map((index) => (
            <span key={`right-${index}`} />
          ))}
        </div>
        <div className={`rail-pocket rail-pocket-${currentPocketEdge}`} style={pocketStyle} />
        <div ref={boardRef} className="board" style={{ gridTemplateColumns: `repeat(${puzzle.size}, 1fr)` }}>
          {cells.map((coord) => {
            const key = coordKey(coord);
            const playerPiece = playerByCell.get(key);
            const fixedPiece = hiddenGlassKeys.has(key) ? undefined : fixedByCell.get(key);
            return (
              <Cell
                key={key}
                coord={coord}
                fixedPiece={fixedPiece}
                playerPiece={playerPiece}
                isPocket={false}
                isAvailable={false}
                selected={Boolean(playerPiece && playerPiece.id === selectedPieceId)}
                onClick={() => onCellClick(coord)}
                onStartDrag={onStartPieceDrag}
              />
            );
          })}
          <div ref={ballRef} className={`eight-ball ${sinking ? "sinking" : ""}`} style={{ "--cell-size": `${100 / puzzle.size}%` } as CSSProperties}>
            <span className="eight-ball-number">8</span>
          </div>
        </div>
        {shot && (
          <div className="cue-launch" style={cueStyle()} aria-hidden="true">
            <span className="animated-cue-stick" />
            <span className="animated-cue-ball" />
          </div>
        )}
      </div>
    </div>
  );
}
