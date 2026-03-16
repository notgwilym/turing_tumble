<script lang="ts">
    import type { Piece } from '@engine/pieces/Piece';
    import { FlippablePiece, Orientation } from '@engine/pieces/Piece';
    import { Bit } from '@engine/pieces/Bit';
    import { Ramp } from '@engine/pieces/Ramp';
    import { Crossover } from '@engine/pieces/Crossover';
    import { Interceptor } from '@engine/pieces/Interceptor';
    import { Gear, NormalGear, GearBit, GearRotation } from '@engine/pieces/Gear';
    import {
        PIECE_ANIM_CONFIGS,
        getDisplayWidthPx,
        getDisplayHeightPx,
        type PieceAnimConfig,
    } from '../Animation/PieceAnimConfig';

    let { 
        piece,
        gridSize,
        globalScale,
        onToggle,
        onRemove,
    }: {
        piece: Piece;
        gridSize: number;
        globalScale: number;
        onToggle?: (x: number, y: number) => void;
        onRemove?: (x: number, y: number) => void;
    } = $props();

    // ─── Piece type → config lookup ──────────────────────────────────────────

    function getPieceType(p: Piece): string {
        if (p instanceof Bit)         return 'bit';
        if (p instanceof Ramp)        return 'ramp';
        if (p instanceof Crossover)   return 'crossover';
        if (p instanceof Interceptor) return 'interceptor';
        if (p instanceof GearBit)     return 'gearbit';
        if (p instanceof NormalGear)  return 'gear';
        return 'bit';
    }

    function getAnimConfig(p: Piece): PieceAnimConfig {
        const type = getPieceType(p);
        return PIECE_ANIM_CONFIGS.find(c => c.type === type) ?? PIECE_ANIM_CONFIGS[0];
    }

    // ─── Derived values ──────────────────────────────────────────────────────

    const pieceType = $derived(getPieceType(piece));
    const animCfg  = $derived(getAnimConfig(piece));
    const svgPath  = $derived(animCfg.svgPath);

    const dw = $derived(getDisplayWidthPx(animCfg, globalScale, gridSize));
    const dh = $derived(getDisplayHeightPx(animCfg, globalScale, gridSize));

    const cellCentreX = $derived(piece.x * gridSize + gridSize / 2);
    const cellCentreY = $derived(piece.y * gridSize + gridSize / 2);

    const pegX = $derived(animCfg.centre.x * dw);
    const pegY = $derived(animCfg.centre.y * dh);

    const left = $derived(cellCentreX - pegX);
    const top  = $derived(cellCentreY - pegY);

    // ─── Visual model ────────────────────────────────────────────────────────
    //
    // Two independent layers, both around the peg hole:
    //
    // FACING (scaleX): left = scaleX(-1), right = scaleX(1)
    //   Set during SETUP. Mirrors the SVG.
    //   Left-facing animation paths are just mirrored right-facing paths.
    //
    // STATE (rotation): the piece's mechanical state.
    //   This is what gets ANIMATED when the ball passes.
    //   - Bit: 0° or 90° (arm position)
    //   - GearBit: 0° or 90° (gear state)
    //   - NormalGear: 0° or 90° + 22.5° tooth offset
    //   - Ramp: 0° at rest, tilts during animation then resets
    //   - Crossover/Interceptor: always 0°
    //
    // Transform: scaleX first, then rotate. Both at peg hole origin.

    const facingScaleX = $derived.by(() => {
        // Only Ramp has a meaningful facing direction (channel slopes one way).
        // Bit's orientation is expressed purely through rotation (arm position).
        // GearBit facing is handled separately if needed.
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
            const base = piece.rotation === GearRotation.Clockwise ? 90 : 0;
            return base + 22.5;
        }
        return 0;
    });

    const transform = $derived.by(() => {
        const parts: string[] = [];
        if (facingScaleX === -1) parts.push('scaleX(-1)');
        if (stateRotationDeg !== 0) parts.push(`rotate(${stateRotationDeg}deg)`);
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

    function handleClick() {
        if (isTogglable) onToggle?.(piece.x, piece.y);
    }

    function handleDragStart(e: DragEvent) {
        const payload = JSON.stringify({
            pieceType,
            orientation:  piece instanceof FlippablePiece ? piece.orientation  : undefined,
            rotation:     piece instanceof Gear           ? piece.rotation      : undefined,
            fromX: piece.x,
            fromY: piece.y,
        });
        e.dataTransfer!.setData('application/turing-piece', payload);
        e.dataTransfer!.effectAllowed = 'move';
        e.stopPropagation();
    }

    function handleDragEnd(e: DragEvent) {
        if (e.dataTransfer!.dropEffect === 'none') onRemove?.(piece.x, piece.y);
    }
</script>

<div
    class="piece {pieceType}"
    class:toggleable={isTogglable}
    style="
        position: absolute;
        left: {left}px;
        top: {top}px;
        width: {dw}px;
        height: {dh}px;
        transform: {transform};
        transform-origin: {transformOrigin};
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
    }
    .piece:active { cursor: grabbing; }
    .piece.toggleable:hover {
        outline: 2px solid rgba(255, 230, 50, 0.7);
        outline-offset: -3px;
    }
    .piece img {
        width: 100%;
        height: 100%;
        user-select: none;
        pointer-events: none;
    }
    .bit img         { filter: drop-shadow(0 2px 4px rgba(0, 186, 254, 0.3)); }
    .ramp img        { filter: drop-shadow(0 2px 4px rgba(0, 200, 111, 0.3)); }
    .crossover img   { filter: drop-shadow(0 2px 4px rgba(255, 114, 59, 0.3)); }
    .gear img,
    .gearbit img     { filter: drop-shadow(0 2px 4px rgba(190, 38, 77, 0.3)); }
    .interceptor img { filter: drop-shadow(0 2px 4px rgba(72, 72, 72, 0.5)); }
</style>