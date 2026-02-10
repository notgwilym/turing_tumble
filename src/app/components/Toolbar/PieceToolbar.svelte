<script lang="ts">
    import { Orientation } from '@engine/pieces/Piece';
    import { GearRotation } from '@engine/pieces/Gear';
    import PieceIcon from './PieceIcon.svelte';
    import type { PieceConfig } from './PieceIcon.svelte';

    // Each entry is mutable state so the orientation toggle is reactive
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

    // Toggle the orientation/rotation of a piece type in the toolbar
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
</script>

<aside class="piece-toolbar">
    <h3 class="toolbar-title">Pieces</h3>
    <p class="toolbar-hint">Drag onto board<br/>Click ◀▶ to flip</p>

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
        font-size: 0.7rem;
        color: #666;
        text-align: center;
        line-height: 1.4;
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
</style>