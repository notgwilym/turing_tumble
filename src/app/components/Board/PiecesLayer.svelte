<script lang="ts">
    import type { Piece } from '@engine/pieces/Piece';
    import PieceSprite from './PieceSprite.svelte';
    import type { AnimPieceState } from '../Animation/AnimationController';

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
        animPieceStates,
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
        /** Keyed by "col,row". When present, overrides piece rotation/transition. */
        animPieceStates?: Map<string, AnimPieceState> | null;
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
                    animState={animPieceStates?.get(`${x},${y}`) ?? null}
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
