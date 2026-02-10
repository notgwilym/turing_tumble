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
        background: rgba(0, 0, 0, 0.4);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 10px;
        min-width: 150px;
        max-width: 170px;
        align-self: flex-start;
    }

    .toolbar-title {
        margin: 0 0 0.1rem;
        font-size: 0.95rem;
        font-weight: 700;
        color: #fff;
        letter-spacing: 0.05em;
        text-transform: uppercase;
        text-align: center;
    }

    .toolbar-hint {
        margin: 0 0 0.5rem;
        font-size: 0.68rem;
        color: #666;
        text-align: center;
        line-height: 1.5;
    }

    .piece-list {
        display: flex;
        flex-direction: column;
        gap: 0.2rem;
    }

    .divider {
        border: none;
        border-top: 1px solid rgba(255, 255, 255, 0.07);
        margin: 0.1rem 0;
    }

    .section-divider {
        border: none;
        border-top: 1px solid rgba(255, 255, 255, 0.15);
        margin: 0.4rem 0 0.2rem;
    }

    .clear-btn {
        width: 100%;
        padding: 0.4rem 0.5rem;
        font-size: 0.8rem;
        border-radius: 6px;
        border: 1px solid rgba(255, 80, 80, 0.3);
        background: rgba(255, 80, 80, 0.1);
        color: #ff8888;
        cursor: pointer;
        transition: background 0.15s, border-color 0.15s, color 0.15s;
        text-align: center;
    }

    .clear-btn:hover {
        background: rgba(255, 80, 80, 0.2);
        border-color: rgba(255, 80, 80, 0.5);
    }

    .clear-btn.armed {
        background: rgba(255, 160, 0, 0.25);
        border-color: rgba(255, 160, 0, 0.7);
        color: #ffcc44;
        animation: pulse 0.6s ease infinite alternate;
    }

    @keyframes pulse {
        from { opacity: 0.8; }
        to   { opacity: 1; }
    }
</style>