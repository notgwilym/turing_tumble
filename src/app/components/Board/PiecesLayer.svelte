<script lang="ts">
    import type { Piece } from '@engine/pieces/Piece';
    import PieceSprite from './PieceSprite.svelte';
    
    let { 
        pieces,
        gridSize,
        globalScale,
        onToggle,
        onRemove,
    }: {
        pieces: (Piece | null)[][];
        gridSize: number;
        globalScale: number;
        onToggle?: (x: number, y: number) => void;
        onRemove?: (x: number, y: number) => void;
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