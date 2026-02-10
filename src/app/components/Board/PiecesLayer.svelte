<script lang="ts">
    import type { Piece } from '@engine/pieces/Piece';
    import PieceSprite from './PieceSprite.svelte';
    
    let { 
        pieces,
        gridSize,
        onFlip,
        onRemove,
    }: {
        pieces: (Piece | null)[][];
        gridSize: number;
        onFlip?: (x: number, y: number) => void;
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
                    {onFlip}
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
        /* Must be auto so PieceSprite receives mouse/drag events */
        pointer-events: auto;
    }
</style>