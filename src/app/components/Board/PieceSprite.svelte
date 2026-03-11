<script lang="ts">
    import type { Piece } from '@engine/pieces/Piece';
    import { FlippablePiece, Orientation } from '@engine/pieces/Piece';
    import { Bit } from '@engine/pieces/Bit';
    import { Ramp } from '@engine/pieces/Ramp';
    import { Crossover } from '@engine/pieces/Crossover';
    import { Interceptor } from '@engine/pieces/Interceptor';
    import { Gear, NormalGear, GearBit, GearRotation } from '@engine/pieces/Gear';
    import { PIECE_SIZES, PIECE_SCALE } from './PieceConfig';
    import type { PieceType } from './PieceConfig';

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

    console.log(gridSize, piece.x, piece.y)

    function getPieceType(p: Piece): PieceType {
        if (p instanceof Bit)         return 'bit';
        if (p instanceof Ramp)        return 'ramp';
        if (p instanceof Crossover)   return 'crossover';
        if (p instanceof Interceptor) return 'interceptor';
        if (p instanceof GearBit)     return 'gearbit';
        if (p instanceof NormalGear)  return 'gear';
        return 'bit'; // fallback
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

    const pieceType   = $derived(getPieceType(piece));
    const pieceSize   = $derived(PIECE_SIZES[pieceType]);
    const svgPath     = $derived(getSvgPath(piece));

    const left = $derived(piece.x * gridSize + (gridSize - pieceSize.w * PIECE_SCALE) / 2);
    const top  = $derived(piece.y * gridSize + (gridSize - pieceSize.h * PIECE_SCALE) / 2);

    $effect(() => console.log('pos', piece.x, piece.y, '→', left, top));

    const isTogglable = $derived(piece instanceof FlippablePiece || piece instanceof GearBit);

    const svgRotation = $derived(() => {
        if (piece instanceof Gear) {
            const base = piece.rotation === GearRotation.Clockwise ? 90 : 0;
            return piece instanceof NormalGear ? base + 22.5 : base;
        }
        if (piece instanceof Bit) return piece.orientation === Orientation.Left ? 90 : 0;
        return 0;
    });

    const svgScaleX = $derived(
        piece instanceof Ramp && piece.orientation === Orientation.Left ? -1 : 1
    );

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
        width: {pieceSize.w * PIECE_SCALE}px;
        height: {pieceSize.h * PIECE_SCALE}px;
        transform: rotate({svgRotation()}deg) scaleX({svgScaleX});
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