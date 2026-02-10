<script lang="ts">
    import { CellType } from '@engine/Board';
    import Cell from './Cell.svelte';

    let {
        board,
        gridSize,
        onPieceDrop,
    }: {
        board: CellType[][];
        gridSize: number;
        onPieceDrop?: (x: number, y: number, payload: string) => void;
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
                {onPieceDrop}
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