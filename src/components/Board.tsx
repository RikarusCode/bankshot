import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import { buildBallAnimationSegments, directionDelta, interpolateBallSegment } from "../game/animationPath";
import { coordKey, pocketEdge } from "../game/directions";
import { playBounce, playCueStrike, playGlassBreak, playGlassTick, playPocket, playRailBounce, playSolidBounce } from "../game/sound";
import type { Coord, FixedPiece, PlayerPiece, PuzzleConfig, SimulationResult } from "../game/types";
import { Cell } from "./Cell";

const BALL_SPEED_CELLS_PER_SECOND = 5.2;
const CUE_STICK_HIT_MS = 260;
const CUE_FADE_MS = 320;
const CUE_STICK_PULLBACK_PX = 40;
const BALL_SINK_MS = 520;
const POCKET_SINK_EXTRA_CELLS = 0.14;

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
  if (position.row < -0.5) return { row: position.row - POCKET_SINK_EXTRA_CELLS, col: position.col };
  if (position.row > size - 0.5) return { row: position.row + POCKET_SINK_EXTRA_CELLS, col: position.col };
  if (position.col < -0.5) return { row: position.row, col: position.col - POCKET_SINK_EXTRA_CELLS };
  if (position.col > size - 0.5) return { row: position.row, col: position.col + POCKET_SINK_EXTRA_CELLS };
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
  const cueLayerRef = useRef<HTMLDivElement>(null);
  const cueBallRef = useRef<HTMLSpanElement>(null);
  const cueStickRef = useRef<HTMLSpanElement>(null);
  const animationFrameRef = useRef<number | undefined>(undefined);
  const cueFrameRef = useRef<number | undefined>(undefined);
  const sinkTimeoutRef = useRef<number | undefined>(undefined);
  const lastBallSizeRef = useRef(0);
  const mutedRef = useRef(muted);
  const [boardSize, setBoardSize] = useState(0);
  const [hiddenGlassKeys, setHiddenGlassKeys] = useState<Set<string>>(() => new Set());
  const [sinking, setSinking] = useState(false);
  const [showCue, setShowCue] = useState(false);
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
    const offset = boardOffsetInRail();
    const x = offset.x + ((coord.col + 0.5) / puzzle.size) * metrics.width - metrics.ballSize / 2;
    const y = offset.y + ((coord.row + 0.5) / puzzle.size) * metrics.width - metrics.ballSize / 2;
    if (Math.abs(metrics.ballSize - lastBallSizeRef.current) > 0.1) {
      const size = `${metrics.ballSize}px`;
      ball.style.width = size;
      ball.style.height = size;
      ball.style.setProperty("--ball-size", size);
      lastBallSizeRef.current = metrics.ballSize;
    }
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

  function cueGeometry() {
    const metrics = ballMetrics();
    if (!metrics) return undefined;
    const cell = metrics.width / puzzle.size;
    const offset = boardOffsetInRail();
    const centerX = ((puzzle.start.col + 0.5) / puzzle.size) * metrics.width;
    const centerY = ((puzzle.start.row + 0.5) / puzzle.size) * metrics.width;
    const delta = directionDelta(puzzle.launchDirection);
    const cueBallSize = metrics.ballSize * 0.92;
    const contactDistance = metrics.ballSize / 2 + cueBallSize / 2;
    const cueStartDistance = Math.max(cell * 1.1, contactDistance + cell * 0.65);
    const cueContactTravel = Math.max(0, cueStartDistance - contactDistance);
    const startX = centerX - delta.col * cueStartDistance;
    const startY = centerY - delta.row * cueStartDistance;
    const angle = Math.atan2(delta.row, delta.col) * (180 / Math.PI);
    return { offset, startX, startY, angle, cell, cueBallSize, cueContactTravel };
  }

  function cueStyle(): CSSProperties {
    const geometry = cueGeometry();
    if (!geometry) return {};
    return {
      "--cue-x": `${geometry.offset.x + geometry.startX}px`,
      "--cue-y": `${geometry.offset.y + geometry.startY}px`,
      "--cue-angle": `${geometry.angle}deg`,
      "--cue-ball-size": `${geometry.cueBallSize}px`,
      "--cell-size": `${geometry.cell}px`
    } as CSSProperties;
  }

  useEffect(() => {
    if (!shot) {
      if (animationFrameRef.current !== undefined) window.cancelAnimationFrame(animationFrameRef.current);
      if (cueFrameRef.current !== undefined) window.cancelAnimationFrame(cueFrameRef.current);
      if (sinkTimeoutRef.current !== undefined) window.clearTimeout(sinkTimeoutRef.current);
      setShowCue(false);
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
    setShowCue(true);
    setBallTransform(segments[0].from.coord, 0);

    const animate = (time: number) => {
      const segment = segments[segmentIndex];
      if (!segment) {
        const finalCoord = segments[segments.length - 1].to.coord;
        setBallTransform(finalCoord, cumulativeDistance * 210);
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

    let cueSoundPlayed = false;
    let ballLaunched = false;

    const startCueTimeline = (timelineStartedAt: number) => {
      const cueLayer = cueLayerRef.current;
      const cueBall = cueBallRef.current;
      const cueStick = cueStickRef.current;
      const geometry = cueGeometry();
      if (!cueLayer || !cueBall || !cueStick || !geometry) {
        cueFrameRef.current = window.requestAnimationFrame(startCueTimeline);
        return;
      }

      const cueBallTravelMs = Math.max(70, (geometry.cueContactTravel / geometry.cell / BALL_SPEED_CELLS_PER_SECOND) * 1000);
      const cueBallHitMs = CUE_STICK_HIT_MS + cueBallTravelMs;
      const fadeStartMs = cueBallHitMs + (1 / BALL_SPEED_CELLS_PER_SECOND) * 1000;
      const cueEndMs = fadeStartMs + CUE_FADE_MS;
      const easeOut = (value: number) => 1 - Math.pow(1 - value, 3);

      const animateCue = (time: number) => {
        const elapsed = time - timelineStartedAt;
        const stickProgress = Math.min(1, Math.max(0, elapsed / CUE_STICK_HIT_MS));
        const stickX = -CUE_STICK_PULLBACK_PX * (1 - easeOut(stickProgress));
        cueStick.style.transform = `translate3d(${stickX}px, 0, 0)`;

        if (!cueSoundPlayed && elapsed >= CUE_STICK_HIT_MS) {
          cueSoundPlayed = true;
          playCueStrike(mutedRef.current);
        }

        const cueBallProgress = Math.min(1, Math.max(0, (elapsed - CUE_STICK_HIT_MS) / cueBallTravelMs));
        cueBall.style.transform = `translate3d(${geometry.cueContactTravel * cueBallProgress}px, 0, 0)`;

        if (!ballLaunched && elapsed >= cueBallHitMs) {
          ballLaunched = true;
          animationFrameRef.current = window.requestAnimationFrame(animate);
        }

        const fadeProgress = Math.min(1, Math.max(0, (elapsed - fadeStartMs) / CUE_FADE_MS));
        cueLayer.style.opacity = `${1 - fadeProgress}`;

        if (elapsed < cueEndMs) {
          cueFrameRef.current = window.requestAnimationFrame(animateCue);
        } else {
          setShowCue(false);
        }
      };

      cueFrameRef.current = window.requestAnimationFrame(animateCue);
    };

    cueFrameRef.current = window.requestAnimationFrame(startCueTimeline);

    return () => {
      if (animationFrameRef.current !== undefined) window.cancelAnimationFrame(animationFrameRef.current);
      if (cueFrameRef.current !== undefined) window.cancelAnimationFrame(cueFrameRef.current);
      if (sinkTimeoutRef.current !== undefined) window.clearTimeout(sinkTimeoutRef.current);
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
            const playerPiece = hiddenGlassKeys.has(key) ? undefined : playerByCell.get(key);
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
        </div>
        <div ref={ballRef} className={`eight-ball ${sinking ? "sinking" : ""}`} style={{ "--cell-size": `${100 / puzzle.size}%` } as CSSProperties}>
          <span className="eight-ball-number">8</span>
        </div>
        {showCue && (
          <div ref={cueLayerRef} className="cue-launch" style={cueStyle()} aria-hidden="true">
            <span ref={cueStickRef} className="animated-cue-stick" />
            <span ref={cueBallRef} className="animated-cue-ball" />
          </div>
        )}
      </div>
    </div>
  );
}
