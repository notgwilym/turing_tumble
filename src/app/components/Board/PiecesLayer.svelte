<script lang="ts">
    import type { Piece } from '@engine/pieces/Piece';
    import PieceSprite from './PieceSprite.svelte';
    
    let { 
        pieces,
        gridSize,
        onToggle,
        onRemove,
    }: {
        pieces: (Piece | null)[][];
        gridSize: number;
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
        /*
         * IMPORTANT: must be none on the container.
         * With 'auto', this div's transparent background swallows all drag
         * events over empty cells, so Cell.handleDragOver never fires and
         * slot-peg highlighting breaks entirely.
         * Individual PieceSprite divs declare their own pointer-events: auto,
         * so pieces remain fully interactive despite this setting.
         */
        pointer-events: none;
    }
</style>