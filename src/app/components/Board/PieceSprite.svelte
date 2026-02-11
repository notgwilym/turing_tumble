<script lang="ts">
    import type { Piece } from '@engine/pieces/Piece';
    import { FlippablePiece, Orientation } from '@engine/pieces/Piece';
    import { Bit } from '@engine/pieces/Bit';
    import { Ramp } from '@engine/pieces/Ramp';
    import { Crossover } from '@engine/pieces/Crossover';
    import { Interceptor } from '@engine/pieces/Interceptor';
    import { Gear, NormalGear, GearBit, GearRotation } from '@engine/pieces/Gear';
    
    let { 
        piece,
        gridSize,
        onToggle,
        onRemove,
    }: {
        piece: Piece;
        gridSize: number;
        onToggle?: (x: number, y: number) => void;
        onRemove?: (x: number, y: number) => void;
    } = $props();
    
    const left = $derived(() => piece.x * gridSize);
    const top  = $derived(() => piece.y * gridSize);
    const pieceType = $derived(() => getPieceType(piece));
    const svgPath   = $derived(getSvgPath(piece));

    // FlippablePiece (Bit, Ramp) and GearBit respond to clicks.
    // NormalGear is excluded: its rotation is set by GearSetManager adjacency
    // rules and has no independent user-controllable state.
    const isTogglable = $derived(
        piece instanceof FlippablePiece || piece instanceof GearBit
    );

    const svgRotation = $derived(() => {
        if (piece instanceof Gear) {
            const base = piece.rotation === GearRotation.Clockwise ? 90 : 0;
            return piece instanceof NormalGear ? base + 22.5 : base;
        }
        if (piece instanceof Bit) {
            return piece.orientation === Orientation.Left ? 90 : 0;
        }
        return 0;
    });

    const svgScaleX = $derived(() => {
        if (piece instanceof Ramp) {
            return piece.orientation === Orientation.Left ? -1 : 1;
        }
        return 1;
    });
    
    function getPieceType(p: Piece): string {
        if (p instanceof Bit)         return 'bit';
        if (p instanceof Ramp)        return 'ramp';
        if (p instanceof Crossover)   return 'crossover';
        if (p instanceof Interceptor) return 'interceptor';
        if (p instanceof GearBit)     return 'gearbit';
        if (p instanceof NormalGear)  return 'gear';
        return 'unknown';
    }
    
    function getSvgPath(p: Piece): string {
        if (p instanceof Bit)         return '/src/assets/bit.svg';
        if (p instanceof Ramp)        return '/src/assets/ramp.svg';
        if (p instanceof Crossover)   return '/src/assets/crossover.svg';
        if (p instanceof Interceptor) return '/src/assets/interceptor.svg';
        if (p instanceof GearBit)     return '/src/assets/gearbit.svg';
        if (p instanceof NormalGear)  return '/src/assets/gear.svg';
        return '';
    }

    function handleClick() {
        if (isTogglable) onToggle?.(piece.x, piece.y);
    }

    function handleDragStart(e: DragEvent) {
        let orientation: Orientation | undefined;
        let gearRotation: GearRotation | undefined;
        if (piece instanceof FlippablePiece) orientation = piece.orientation;
        if (piece instanceof Gear) gearRotation = piece.rotation;

        const payload = JSON.stringify({
            pieceType: getPieceType(piece),
            orientation,
            rotation: gearRotation,
            fromX: piece.x,
            fromY: piece.y,
        });
        e.dataTransfer!.setData('application/turing-piece', payload);
        e.dataTransfer!.effectAllowed = 'move';
        e.stopPropagation();
    }

    function handleDragEnd(e: DragEvent) {
        if (e.dataTransfer!.dropEffect === 'none') {
            onRemove?.(piece.x, piece.y);
        }
    }

    const toggleHint = $derived(() => {
        if (piece instanceof GearBit)     return 'Click to turn gear set, drag to move';
        if (piece instanceof FlippablePiece) return 'Click to flip, drag to move';
        return 'Drag to move';
    });
</script>

<div 
    class="piece {pieceType()}"
    class:toggleable={isTogglable}
    style="
        left: {left()}px; 
        top: {top()}px; 
        width: {gridSize}px; 
        height: {gridSize}px;
        transform: rotate({svgRotation()}deg) scaleX({svgScaleX()});
    "
    draggable="true"
    ondragstart={handleDragStart}
    ondragend={handleDragEnd}
    onclick={handleClick}
    role="button"
    tabindex="0"
    aria-label="{pieceType()} piece"
    title={toggleHint()}
>
    <img src={svgPath} alt={pieceType()} draggable="false" />
</div>

<style>
    .piece {
        position: absolute;
        display: flex;
        align-items: center;
        justify-content: center;
        pointer-events: auto;
        transition: transform 0.2s ease-out;
        cursor: grab;
        border-radius: 6px;
    }

    .piece:active { cursor: grabbing; }

    /* Yellow ring signals "click to toggle" */
    .piece.toggleable:hover {
        outline: 2px solid rgba(255, 230, 50, 0.7);
        outline-offset: -3px;
    }
    
    .piece img {
        width: 90%;
        height: 90%;
        object-fit: contain;
        user-select: none;
        -webkit-user-drag: none;
        pointer-events: none;
    }
    
    .bit img         { filter: drop-shadow(0 2px 4px rgba(0, 186, 254, 0.3)); }
    .ramp img        { filter: drop-shadow(0 2px 4px rgba(0, 200, 111, 0.3)); }
    .crossover img   { filter: drop-shadow(0 2px 4px rgba(255, 114, 59, 0.3)); }
    .gear img,
    .gearbit img     { filter: drop-shadow(0 2px 4px rgba(190, 38, 77, 0.3)); }
    .interceptor img { filter: drop-shadow(0 2px 4px rgba(72, 72, 72, 0.5)); }
</style>