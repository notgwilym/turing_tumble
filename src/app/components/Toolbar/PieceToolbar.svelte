<script lang="ts">
    import { Orientation } from '@engine/pieces/Piece';
    import { GearRotation } from '@engine/pieces/Gear';
    import PieceIcon from './PieceIcon.svelte';
    import type { PieceConfig } from './PieceIcon.svelte';

    let {
        onClearBoard,
    }: {
        onClearBoard?: () => void;
    } = $props();

    let pieces = $state<PieceConfig[]>([
        {
            type: 'Bit',
            label: 'Bit',
            svgPath: '/src/assets/bit.svg',
            orientation: Orientation.Right,
        },
        {
            type: 'Ramp',
            label: 'Ramp',
            svgPath: '/src/assets/ramp.svg',
            orientation: Orientation.Right,
        },
        {
            type: 'Crossover',
            label: 'Crossover',
            svgPath: '/src/assets/crossover.svg',
        },
        {
            type: 'Interceptor',
            label: 'Interceptor',
            svgPath: '/src/assets/interceptor.svg',
        },
        {
            type: 'NormalGear',
            label: 'Gear',
            svgPath: '/src/assets/gear.svg',
        },
        {
            type: 'GearBit',
            label: 'Gear Bit',
            svgPath: '/src/assets/gearbit.svg',
            rotation: GearRotation.Counterclockwise,
        },
    ]);

    function toggleOrientation(index: number) {
        const p = pieces[index];
        if (p.orientation !== undefined) {
            p.orientation = p.orientation === Orientation.Left
                ? Orientation.Right
                : Orientation.Left;
        } else if (p.rotation !== undefined) {
            p.rotation = p.rotation === GearRotation.Clockwise
                ? GearRotation.Counterclockwise
                : GearRotation.Clockwise;
        }
    }

    let confirmClear = $state(false);
    let confirmTimeout: ReturnType<typeof setTimeout> | null = null;

    // Two-step clear: first click arms it, second click fires.
    // Resets automatically after 2 s if not confirmed.
    function handleClearClick() {
        if (!confirmClear) {
            confirmClear = true;
            if (confirmTimeout) clearTimeout(confirmTimeout);
            confirmTimeout = setTimeout(() => { confirmClear = false; }, 2000);
        } else {
            confirmClear = false;
            if (confirmTimeout) clearTimeout(confirmTimeout);
            onClearBoard?.();
        }
    }
</script>

<aside class="piece-toolbar">
    <h3 class="toolbar-title">Pieces</h3>
    <p class="toolbar-hint">
        Drag to place<br/>
        Click ◀▶ to flip<br/>
        Drag off board to delete
    </p>

    <div class="piece-list">
        {#each pieces as config, i}
            <PieceIcon
                {config}
                onOrientationToggle={() => toggleOrientation(i)}
            />
            {#if i < pieces.length - 1}
                <hr class="divider" />
            {/if}
        {/each}
    </div>

    <hr class="section-divider" />

    <button
        class="clear-btn"
        class:armed={confirmClear}
        onclick={handleClearClick}
        title="Clear all pieces from the board"
    >
        {#if confirmClear}
            ⚠️ Confirm clear
        {:else}
            🗑 Clear board
        {/if}
    </button>
</aside>

<style>
    .piece-toolbar {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        padding: 1rem 0.75rem;
        background: var(--panel-bg);
        border: 2px solid var(--panel-border);
        border-radius: 6px 12px 8px 10px / 10px 6px 12px 8px;
        box-shadow: 4px 4px 0 var(--panel-shadow);
        min-width: 150px;
        max-width: 170px;
        align-self: flex-start;
    }

    .toolbar-title {
        margin: 0 0 0.1rem;
        font-size: 1rem;
        font-weight: 700;
        color: var(--ink);
        letter-spacing: 0.06em;
        text-transform: uppercase;
        text-align: center;
        font-family: 'Oliver', 'Architects Daughter', cursive;
    }

    .toolbar-hint {
        margin: 0 0 0.5rem;
        font-size: 0.7rem;
        color: var(--ink-faint);
        text-align: center;
        line-height: 1.5;
        font-family: 'Oliver', 'Architects Daughter', cursive;
    }

    .piece-list {
        display: flex;
        flex-direction: column;
        gap: 0.2rem;
    }

    .divider {
        border: none;
        border-top: 1px solid var(--grid-line);
        margin: 0.1rem 0;
    }

    .section-divider {
        border: none;
        border-top: 2px solid var(--panel-border);
        margin: 0.4rem 0 0.2rem;
    }

    .clear-btn {
        width: 100%;
        padding: 0.4rem 0.5rem;
        font-size: 0.8rem;
        font-family: 'Oliver', 'Architects Daughter', cursive;
        border-radius: 4px 7px 5px 6px / 6px 4px 7px 5px;
        border: 2px solid hsl(8, 55%, 60%);
        background: hsl(8, 70%, 90%);
        color: hsl(8, 55%, 35%);
        cursor: pointer;
        transition: background 0.15s, box-shadow 0.12s, transform 0.12s;
        text-align: center;
        box-shadow: 2px 2px 0 hsl(8, 40%, 70%);
    }

    .clear-btn:hover {
        background: hsl(8, 70%, 85%);
        box-shadow: 3px 3px 0 hsl(8, 40%, 70%);
        transform: translateY(-1px);
    }

    .clear-btn.armed {
        border-color: hsl(38, 75%, 45%);
        background: hsl(38, 85%, 87%);
        color: hsl(38, 65%, 28%);
        box-shadow: 2px 2px 0 hsl(38, 50%, 65%);
        animation: pulse 0.6s ease infinite alternate;
    }

    @keyframes pulse {
        from { opacity: 0.85; }
        to   { opacity: 1; }
    }
</style>