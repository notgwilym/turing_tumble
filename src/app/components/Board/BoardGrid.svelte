<script lang="ts">
    import { CellType } from '@engine/Board';
    import Cell from './Cell.svelte';
    
    let { 
        board,
        gridSize 
    }: {
        board: CellType[][];
        gridSize: number;
    } = $props();
</script>

<div class="grid-layer">
    {#each board as row, y}
        {#each row as cellType, x}
            <Cell 
                {cellType} 
                {x} 
                {y} 
                {gridSize}
            />
        {/each}
    {/each}
</div>

<style>
    .grid-layer {
        position: absolute;
        inset: 0;
        z-index: 1;
    }
</style>