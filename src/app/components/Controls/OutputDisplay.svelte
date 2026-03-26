<script lang="ts">
    import type { Ball } from '@engine/Ball';

    let {
        finishedBalls,
    }: {
        finishedBalls: Ball[];
    } = $props();
</script>

<div class="output-display">
    <span class="label">Output</span>
    <div class="balls-row">
        {#each [...finishedBalls].reverse() as ball, i (i)}
            <div
                class="ball-dot"
                class:red={ball.colour === 'red'}
                class:blue={ball.colour === 'blue'}
                title="Ball {i + 1}: {ball.colour}"
            ></div>
        {/each}
        {#if finishedBalls.length === 0}
            <span class="empty">—</span>
        {/if}
    </div>
</div>

<style>
    .output-display {
        display: flex;
        gap: 0.75rem;
        align-items: center;
        padding: 0.75rem 1rem;
        background: rgba(0, 0, 0, 0.3);
        border-radius: 8px;
        font-family: 'Courier New', monospace;
    }

    .label {
        color: #888;
        font-size: 0.9rem;
        font-weight: 600;
        text-transform: uppercase;
        flex-shrink: 0;
    }

    .balls-row {
        display: flex;
        gap: 6px;
        align-items: center;
        flex-wrap: wrap;
    }

    .ball-dot {
        width: 18px;
        height: 18px;
        border-radius: 50%;
        flex-shrink: 0;
        transition: transform 0.2s ease;
    }

    /* newest ball gets a brief pop-in */
    .ball-dot:first-child {
        animation: pop-in 0.25s ease-out;
    }

    .ball-dot.red {
        background: radial-gradient(circle at 35% 35%, #ff8888, #cc2222);
        box-shadow: 0 0 4px rgba(204, 34, 34, 0.5);
    }

    .ball-dot.blue {
        background: radial-gradient(circle at 35% 35%, #88aaff, #2255cc);
        box-shadow: 0 0 4px rgba(34, 85, 204, 0.5);
    }

    .empty {
        color: #555;
        font-size: 0.9rem;
    }

    @keyframes pop-in {
        0%   { transform: scale(0); }
        70%  { transform: scale(1.2); }
        100% { transform: scale(1); }
    }
</style>