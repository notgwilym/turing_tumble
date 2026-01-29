<script lang="ts">
    import type { Piece } from '@engine/pieces/Piece';
    import PieceSprite from './PieceSprite.svelte';
    
    let { 
        pieces,
        gridSize 
    }: {
        pieces: (Piece | null)[][];
        gridSize: number;
    } = $props();
</script>

<div class="pieces-layer">
    {#each pieces as row, y}
        {#each row as piece, x}
            {#if piece !== null}
                <PieceSprite 
                    {piece} 
                    {gridSize}
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
        pointer-events: none; /* Let clicks pass through to grid */
    }
</style>