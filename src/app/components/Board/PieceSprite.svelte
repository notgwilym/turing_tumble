<script lang="ts">
    import type { Piece } from 'engine/pieces/Piece';
    import { FlippablePiece, Orientation } from '@engine/pieces/Piece';
    import { Bit } from '@engine/pieces/Bit';
    import { Ramp } from '@engine/pieces/Ramp';
    import { Crossover } from '@engine/pieces/Crossover';
    import { Interceptor } from '@engine/pieces/Interceptor';
    import { Gear, NormalGear, GearBit, GearRotation } from '@engine/pieces/Gear';
    
    let { 
        piece,
        gridSize 
    }: {
        piece: Piece;
        gridSize: number;
    } = $props();
    
    // Visual position (centered in cell)
    const left = $derived(() => piece.x * gridSize);
    const top = $derived(() => piece.y * gridSize);
    
    // Determine piece type and properties
    const pieceType = $derived(() => getPieceType(piece));
    const rotation = $derived(() =>
        piece instanceof NormalGear
            ? 22.5
        : piece instanceof GearBit
            ? piece.rotation === GearRotation.Clockwise
                ? 90
                : 0
            : 0
    );
    const h_flip = $derived(() =>
        piece instanceof FlippablePiece && piece.orientation === Orientation.Left
            ? -1
            : 1
    );
    const svgPath = $derived(getSvgPath(piece));
    
    function getPieceType(p: Piece): string {
        if (p instanceof Bit) return 'bit';
        if (p instanceof Ramp) return 'ramp';
        if (p instanceof Crossover) return 'crossover';
        if (p instanceof Interceptor) return 'interceptor';
        if (p instanceof GearBit) return 'gearbit';
        if (p instanceof NormalGear) return 'gear';
        return 'unknown';
    }
    
    function getSvgPath(p: Piece): string {
        // Map piece types to SVG assets
        if (p instanceof Bit) return '/src/assets/bit.svg';
        if (p instanceof Ramp) return '/src/assets/ramp.svg';
        if (p instanceof Crossover) return '/src/assets/crossover.svg';
        if (p instanceof Interceptor) return '/src/assets/interceptor.svg';
        if (p instanceof GearBit) return '/src/assets/gearbit.svg';
        if (p instanceof NormalGear) return '/src/assets/gear.svg';
        return '';
    }
</script>

<div 
    class="piece {pieceType}"
    style="
        left: {left()}px; 
        top: {top()}px; 
        width: {gridSize}px; 
        height: {gridSize}px;
        transform: rotate({rotation()}deg) scaleX({h_flip()});
    "
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
        transition: transform 0.2s ease-out;
    }
    
    .piece img {
        width: 90%;
        height: 90%;
        object-fit: contain;
        user-select: none;
        -webkit-user-drag: none;
    }
    
    /* Piece-specific styles */
    .bit img {
        filter: drop-shadow(0 2px 4px rgba(0, 186, 254, 0.3));
    }
    
    .ramp img {
        filter: drop-shadow(0 2px 4px rgba(0, 200, 111, 0.3));
    }
    
    .crossover img {
        filter: drop-shadow(0 2px 4px rgba(255, 114, 59, 0.3));
    }
    
    .gear img,
    .gearbit img {
        filter: drop-shadow(0 2px 4px rgba(190, 38, 77, 0.3));
    }
    
    .interceptor img {
        filter: drop-shadow(0 2px 4px rgba(72, 72, 72, 0.5));
    }
</style>