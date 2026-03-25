<script lang="ts">
    import { Orientation, FlippablePiece } from '@engine/pieces/Piece';
    import { Gear, NormalGear, GearBit, GearRotation } from '@engine/pieces/Gear';
    import { Bit } from '@engine/pieces/Bit';
    import { Ramp } from '@engine/pieces/Ramp';
    import type { Piece } from '@engine/pieces/Piece';

    import {
        PIECE_ANIM_CONFIGS,
        getDisplayWidthPx,
        getDisplayHeightPx,
    } from '../Animation/PieceAnimConfig';

    let {
        piece,
        gridSize,
        globalScale,
        onToggle,
        onRemove,
        onDragStart,
        onDragEnd,
        dragHoverCell,
        dragOriginCell,
        animState,
    }: {
        piece: Piece;
        gridSize: number;
        globalScale: number;
        onToggle?: (x: number, y: number) => void;
        onRemove?: (x: number, y: number) => void;
        onDragStart?: (x: number, y: number) => void;
        onDragEnd?: () => void;
        dragHoverCell?: { x: number; y: number } | null;
        dragOriginCell?: { x: number; y: number } | null;
        /** When set, overrides rotation and transition (from AnimationController) */
        animState?: { rotation: number; transition: string } | null;
    } = $props();

    // ─── Piece type key ──────────────────────────────────────────────────────

    function getPieceType(p: Piece): string {
        if (p instanceof Bit) return 'bit';
        if (p instanceof Ramp) return 'ramp';
        if (p instanceof GearBit) return 'gearbit';
        if (p instanceof NormalGear) return 'gear';
        return p.constructor.name.toLowerCase();
    }

    const pieceType = $derived(getPieceType(piece));

    const isBeingReplacedHover = $derived(
        dragHoverCell != null &&
        dragHoverCell.x === piece.x && dragHoverCell.y === piece.y &&
        !(dragOriginCell && dragOriginCell.x === piece.x && dragOriginCell.y === piece.y)
    );

    // ─── SVG path ────────────────────────────────────────────────────────────

    const animConfig = $derived(PIECE_ANIM_CONFIGS.find(c => c.type === pieceType));
    const svgPath = $derived(animConfig?.svgPath ?? `/pieces/${pieceType}.svg`);

    // ─── Sizing from PieceAnimConfig ─────────────────────────────────────────

    const dw = $derived(animConfig ? getDisplayWidthPx(animConfig, globalScale, gridSize) : gridSize);
    const dh = $derived(animConfig ? getDisplayHeightPx(animConfig, globalScale, gridSize) : gridSize);

    const pegX = $derived(animConfig ? animConfig.centre.x * dw : dw / 2);
    const pegY = $derived(animConfig ? animConfig.centre.y * dh : dh / 2);

    const cellCentreX = $derived(piece.x * gridSize + gridSize / 2);
    const cellCentreY = $derived(piece.y * gridSize + gridSize / 2);

    const left = $derived(cellCentreX - pegX);
    const top  = $derived(cellCentreY - pegY);

    // ─── Transform ───────────────────────────────────────────────────────────

    const facingScaleX = $derived.by(() => {
        if (piece instanceof Ramp) {
            return piece.orientation === Orientation.Left ? -1 : 1;
        }
        return 1;
    });

    const stateRotationDeg = $derived.by(() => {
        if (piece instanceof Bit) {
            return piece.orientation === Orientation.Left ? 90 : 0;
        }
        if (piece instanceof GearBit) {
            return piece.rotation === GearRotation.Clockwise ? 90 : 0;
        }
        if (piece instanceof NormalGear) {
            return piece.rotation === GearRotation.Clockwise ? 90 : 22.5;
        }
        return 0;
    });

    // When animState is provided, use its rotation instead of the engine-derived one
    const effectiveRotationDeg = $derived(animState ? animState.rotation : stateRotationDeg);
    const effectiveTransition = $derived.by(() => {
        if (animState) return animState.transition;
        // Default CSS transitions for editable pieces (toggling/flipping during board setup)
        if (piece instanceof GearBit || piece instanceof NormalGear) return 'transform 400ms ease-out';
        if (piece instanceof Bit) return 'transform 400ms ease-in';
        if (piece instanceof Ramp) return 'transform 300ms ease-in-out';
        return 'none';
    });

    const transform = $derived.by(() => {
        const parts: string[] = [];
        if (facingScaleX === -1) parts.push('scaleX(-1)');
        if (effectiveRotationDeg !== 0) parts.push(`rotate(${effectiveRotationDeg}deg)`);
        return parts.length > 0 ? parts.join(' ') : 'none';
    });

    const transformOrigin = $derived(`${pegX}px ${pegY}px`);

    // ─── Interaction ─────────────────────────────────────────────────────────

    const isTogglable = $derived(piece instanceof FlippablePiece || piece instanceof GearBit);

    const toggleHint = $derived(
        piece instanceof GearBit        ? 'Click to turn gear set, drag to move' :
        piece instanceof FlippablePiece ? 'Click to flip, drag to move' :
                                          'Drag to move'
    );

    // ─── Drag state ──────────────────────────────────────────────────────────

    let isFadingOut = $state(false);

    // Reusable 1×1 transparent canvas for drag ghost
    let ghostCanvas: HTMLCanvasElement | null = null;
    function getGhost(): HTMLCanvasElement {
        if (!ghostCanvas) {
            ghostCanvas = document.createElement('canvas');
            ghostCanvas.width = 1;
            ghostCanvas.height = 1;
        }
        return ghostCanvas;
    }

    function handleClick() {
        if (isTogglable) onToggle?.(piece.x, piece.y);
    }

   function handleDragStart(e: DragEvent) {
        if (!onDragStart) {
            e.preventDefault();
            return;
        }
        const payload = JSON.stringify({
            pieceType,
            orientation:  piece instanceof FlippablePiece ? piece.orientation  : undefined,
            rotation:     piece instanceof Gear           ? piece.rotation      : undefined,
            fromX: piece.x,
            fromY: piece.y,
        });
        e.dataTransfer!.effectAllowed = 'move';
        e.dataTransfer!.setData('application/turing-piece', payload);
        e.dataTransfer!.setData(
            pieceType === 'gear' ? 'application/piece-gear' : 'application/piece-slot',
            ''
        );
        e.stopPropagation();

        onDragStart?.(piece.x, piece.y);
    }

    function handleDragEnd(e: DragEvent) {
        onDragEnd?.();

        // Component may have been destroyed if the drop already moved/removed the piece
        if (!piece) return;

        const boardEl = (e.target as HTMLElement).closest('[data-board-container]');
        if (boardEl) {
            const rect = boardEl.getBoundingClientRect();
            const inside =
                e.clientX >= rect.left && e.clientX <= rect.right &&
                e.clientY >= rect.top  && e.clientY <= rect.bottom;

            if (!inside) {
                isFadingOut = true;
                setTimeout(() => {
                    onRemove?.(piece.x, piece.y);
                }, 400);
            }
        }
    }
</script>

<div
    class="piece {pieceType}"
    class:fading-out={isFadingOut}
    class:replacing={isBeingReplacedHover}
    style="
        position: absolute;
        left: {left}px;
        top: {top}px;
        width: {dw}px;
        height: {dh}px;
        transform: {transform};
        transform-origin: {transformOrigin};
        transition: {effectiveTransition};
        z-index: {pieceType === 'gear' ? 0 : 1};
    "
    draggable="true"
    onkeydown={(e) => e.key === 'Enter' || e.key === ' ' ? handleClick() : null}
    ondragstart={handleDragStart}
    ondragend={handleDragEnd}
    onclick={handleClick}
    role="button"
    tabindex="0"
    aria-label="{pieceType} piece"
    title={toggleHint}
>
    <img src={svgPath} alt={pieceType} draggable="false" />
</div>

<style>
    .piece {
        display: flex;
        align-items: center;
        justify-content: center;
        pointer-events: auto;
        cursor: grab;
        border-radius: 6px;
        user-select: none;
        -webkit-user-select: none;
    }
    .piece:active { cursor: grabbing; }

    .piece img {
        width: 100%;
        height: 100%;
        user-select: none;
        -webkit-user-select: none;
        pointer-events: none;
    }

    /* Fade out when removed by dragging off board */
    .piece.fading-out {
        opacity: 0;
        transition: opacity 0.4s ease;
        pointer-events: none;
    }

    .piece.replacing {
        opacity: 0.4;
        transition: opacity 0.15s ease;
    }

    .bit img         { filter: drop-shadow(0 2px 4px rgba(0, 186, 254, 0.3)); }
    .ramp img        { filter: drop-shadow(0 2px 4px rgba(0, 200, 111, 0.3)); }
    .crossover img   { filter: drop-shadow(0 2px 4px rgba(255, 114, 59, 0.3)); }
    .gear img,
    .gearbit img     { filter: drop-shadow(0 2px 4px rgba(190, 38, 77, 0.3)); }
    .interceptor img { filter: drop-shadow(0 2px 4px rgba(72, 72, 72, 0.5)); }
</style>