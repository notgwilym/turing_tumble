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
        onFlip,
        onRemove,
    }: {
        piece: Piece;
        gridSize: number;
        // Called when user clicks a flippable piece
        onFlip?: (x: number, y: number) => void;
        // Called when piece is dragged off the board entirely
        onRemove?: (x: number, y: number) => void;
    } = $props();
    
    const left = $derived(() => piece.x * gridSize);
    const top  = $derived(() => piece.y * gridSize);
    
    const pieceType = $derived(() => getPieceType(piece));
    const svgPath   = $derived(getSvgPath(piece));

    const isFlippable = $derived(piece instanceof FlippablePiece);

    const rotation = $derived(() => {
        let base = 0;
        if (piece instanceof Gear) {
            base = piece.rotation === GearRotation.Clockwise ? 90 : 0;
            if (piece instanceof NormalGear) base += 22.5;
        }
        if (piece instanceof Bit) {
            base = piece.orientation === Orientation.Left ? 90 : 0;
        }
        return base;
    });

    const h_flip = $derived(() => {
        if (piece instanceof Ramp) {
            return piece.orientation === Orientation.Left ? -1 : 1;
        }
        return 1;
    });
    
    function getPieceType(p: Piece): string {
        if (p instanceof Bit)        return 'bit';
        if (p instanceof Ramp)       return 'ramp';
        if (p instanceof Crossover)  return 'crossover';
        if (p instanceof Interceptor) return 'interceptor';
        if (p instanceof GearBit)    return 'gearbit';
        if (p instanceof NormalGear) return 'gear';
        return 'unknown';
    }
    
    function getSvgPath(p: Piece): string {
        if (p instanceof Bit)        return '/src/assets/bit.svg';
        if (p instanceof Ramp)       return '/src/assets/ramp.svg';
        if (p instanceof Crossover)  return '/src/assets/crossover.svg';
        if (p instanceof Interceptor) return '/src/assets/interceptor.svg';
        if (p instanceof GearBit)    return '/src/assets/gearbit.svg';
        if (p instanceof NormalGear) return '/src/assets/gear.svg';
        return '';
    }

    function handleClick() {
        if (isFlippable) onFlip?.(piece.x, piece.y);
    }

    // Encode piece identity + board origin into the drag payload.
    // The presence of fromX/fromY tells the drop handler this is a
    // board→board move rather than a toolbar→board placement.
    function handleDragStart(e: DragEvent) {
        let orientation: Orientation | undefined;
        let rotation: GearRotation | undefined;

        if (piece instanceof FlippablePiece) orientation = piece.orientation;
        if (piece instanceof Gear) rotation = piece.rotation;

        const payload = JSON.stringify({
            pieceType: getPieceType(piece),
            orientation,
            rotation,
            fromX: piece.x,
            fromY: piece.y,
        });

        e.dataTransfer!.setData('application/turing-piece', payload);
        // 'move' so Cell's dragover reports dropEffect='move' on success,
        // letting dragend distinguish "landed somewhere" vs "dropped in void"
        e.dataTransfer!.effectAllowed = 'move';
        e.stopPropagation();
    }

    // dragend fires after the drop (or after the drag is cancelled).
    // dropEffect === 'none' means no valid target received the drop →
    // the user dragged the piece off the board, so delete it.
    function handleDragEnd(e: DragEvent) {
        if (e.dataTransfer!.dropEffect === 'none') {
            onRemove?.(piece.x, piece.y);
        }
    }

    // Map piece type string to the canonical class name used in the payload
    function getPieceTypeName(p: Piece): string {
        if (p instanceof Bit)         return 'Bit';
        if (p instanceof Ramp)        return 'Ramp';
        if (p instanceof Crossover)   return 'Crossover';
        if (p instanceof Interceptor) return 'Interceptor';
        if (p instanceof GearBit)     return 'GearBit';
        if (p instanceof NormalGear)  return 'NormalGear';
        return 'Unknown';
    }
</script>

<div 
    class="piece {pieceType()}"
    class:flippable={isFlippable}
    style="
        left: {left()}px; 
        top: {top()}px; 
        width: {gridSize}px; 
        height: {gridSize}px;
        transform: rotate({rotation()}deg) scaleX({h_flip()});
    "
    draggable="true"
    ondragstart={handleDragStart}
    ondragend={handleDragEnd}
    onclick={handleClick}
    role="button"
    tabindex="0"
    aria-label="{pieceType()} piece"
    title={isFlippable ? 'Click to flip, drag to move' : 'Drag to move'}
>
    <img 
        src={svgPath} 
        alt={pieceType()}
        draggable="false"
    />
</div>

<style>
    .piece {
        position: absolute;
        display: flex;
        align-items: center;
        justify-content: center;
        pointer-events: auto;
        transition: transform 0.2s ease-out, outline 0.1s;
        cursor: grab;
        border-radius: 6px;
    }

    .piece:active {
        cursor: grabbing;
    }

    /* Show a flip cursor + highlight ring when hovering a flippable piece */
    .piece.flippable:hover {
        outline: 2px solid rgba(255, 255, 100, 0.6);
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
    
    .bit img      { filter: drop-shadow(0 2px 4px rgba(0, 186, 254, 0.3)); }
    .ramp img     { filter: drop-shadow(0 2px 4px rgba(0, 200, 111, 0.3)); }
    .crossover img { filter: drop-shadow(0 2px 4px rgba(255, 114, 59, 0.3)); }
    .gear img,
    .gearbit img  { filter: drop-shadow(0 2px 4px rgba(190, 38, 77, 0.3)); }
    .interceptor img { filter: drop-shadow(0 2px 4px rgba(72, 72, 72, 0.5)); }
</style>