<script lang="ts">
    import type { Piece } from '@engine/pieces/Piece';
    import PieceSprite from './PieceSprite.svelte';
    
    let { 
        pieces,
        gridSize,
        globalScale,
        onToggle,
        onRemove,
        onDragStart,
        onDragEnd,
        dragHoverCell,
        dragOriginCell,
    }: {
        pieces: (Piece | null)[][];
        gridSize: number;
        globalScale: number;
        onToggle?: (x: number, y: number) => void;
        onRemove?: (x: number, y: number) => void;
        onDragStart?: (x: number, y: number) => void;
        onDragEnd?: () => void;
        dragHoverCell?: { x: number; y: number } | null;
        dragOriginCell?: { x: number; y: number } | null;
    } = $props();
</script>

<div class="pieces-layer">
    {#each pieces as row, y}
        {#each row as piece, x}
            {#if piece !== null}
                <PieceSprite 
                    {piece} 
                    {gridSize}
                    {globalScale}
                    {onToggle}
                    {onRemove}
                    {onDragStart}
                    {onDragEnd}
                    {dragHoverCell}
                    {dragOriginCell}
                />
            {/if}
        {/each}
    {/each}
</div>

<style>
    .pieces-layer {
        position: absolute;
        inset: 0;
        z-index: 2;
        pointer-events: none;
    }
</style>