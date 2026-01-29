<script lang="ts">
    import type { Ball } from '@engine/Ball';
    import BallSprite from './BallSprite.svelte';
    
    let { 
        activeBalls,
        gridSize 
    }: {
        activeBalls: Ball[];
        gridSize: number;
    } = $props();
</script>

<div class="balls-layer">
    {#each activeBalls as ball (ball)}
        <BallSprite 
            {ball} 
            {gridSize}
        />
    {/each}
</div>

<style>
    .balls-layer {
        position: absolute;
        inset: 0;
        z-index: 3;
        pointer-events: none;
    }
</style>