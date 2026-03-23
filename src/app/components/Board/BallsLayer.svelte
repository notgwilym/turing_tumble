<script lang="ts">
    import type { Ball } from '@engine/Ball';
    import BallSprite from './BallSprite.svelte';
    import type { AnimBallState } from '../Animation/AnimationController';

    let {
        activeBalls,
        gridSize,
        animBall = null,
    }: {
        activeBalls: Ball[];
        gridSize: number;
        /** When set, hides engine balls and renders this animated ball instead */
        animBall?: AnimBallState | null;
    } = $props();

    // A dummy Ball object for the animated sprite (colour only, position via worldX/Y)
    const DUMMY_BALL_RED: Ball = { colour: 'red', x: 0, y: 0, prev_x: 0, prev_y: 0 } as any;
    const DUMMY_BALL_BLUE: Ball = { colour: 'blue', x: 0, y: 0, prev_x: 0, prev_y: 0 } as any;
</script>

<div class="balls-layer">
    {#if animBall}
        <!-- Animated ball driven by controller -->
        <BallSprite
            ball={animBall.colour === 'red' ? DUMMY_BALL_RED : DUMMY_BALL_BLUE}
            {gridSize}
            worldX={animBall.x}
            worldY={animBall.y}
        />
    {:else}
        <!-- Normal engine-state balls -->
        {#each activeBalls as ball (ball)}
            <BallSprite {ball} {gridSize} />
        {/each}
    {/if}
</div>

<style>
    .balls-layer {
        position: absolute;
        inset: 0;
        z-index: 3;
        pointer-events: none;
    }
</style>
