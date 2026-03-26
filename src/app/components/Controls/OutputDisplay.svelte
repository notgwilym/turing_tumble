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
        {#each finishedBalls as ball, i (i)}
            <img
                src="/src/assets/ball_{ball.colour}.svg"
                alt={ball.colour}
                class="ball-icon"
                title="Ball {i + 1}: {ball.colour}"
            />
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
        padding: 0.55rem 0.9rem;
        background: var(--panel-bg);
        border: 2px solid var(--panel-border);
        border-radius: 5px 9px 6px 8px / 8px 5px 9px 6px;
        box-shadow: 3px 3px 0 var(--panel-shadow);
        font-family: 'Oliver', 'Architects Daughter', cursive;
    }

    .label {
        color: var(--ink-mid);
        font-size: 0.85rem;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        flex-shrink: 0;
    }

    .balls-row {
        display: flex;
        gap: 6px;
        align-items: center;
        flex-wrap: wrap;
    }

    .ball-icon {
        width: 22px;
        height: 22px;
        flex-shrink: 0;
    }

    .ball-icon:last-child {
        animation: pop-in 0.25s ease-out;
    }

    .empty {
        color: var(--ink-faint);
        font-size: 0.9rem;
    }

    @keyframes pop-in {
        0%   { transform: scale(0); }
        70%  { transform: scale(1.2); }
        100% { transform: scale(1); }
    }
</style>