<script lang="ts">
    import { Orientation } from '@engine/pieces/Piece';
    import { GearRotation } from '@engine/pieces/Gear';

    export type PieceConfig = {
        type: 'Bit' | 'Ramp' | 'Crossover' | 'Interceptor' | 'NormalGear' | 'GearBit';
        label: string;
        svgPath: string;
        // Orientation state (only relevant for flippable pieces)
        orientation?: Orientation;
        rotation?: GearRotation;
    };

    let {
        config,
        onOrientationToggle,
    }: {
        config: PieceConfig;
        onOrientationToggle?: () => void;
    } = $props();

    // Compute the visual rotation for the SVG preview
    const previewRotation = $derived(() => {
        if (config.type === 'Bit') {
            return config.orientation === Orientation.Left ? 90 : 0;
        }
        if (config.type === 'GearBit') {
            return config.rotation === GearRotation.Clockwise ? 90 : 0;
        }
        return 0;
    });

    const previewFlip = $derived(() => {
        if (config.type === 'Ramp') {
            return config.orientation === Orientation.Left ? -1 : 1;
        }
        return 1;
    });

    const isFlippable = $derived(
        config.type === 'Bit' || config.type === 'Ramp' || config.type === 'GearBit'
    );

    // On dragstart, write the piece type + current orientation into the transfer payload.
    // The Cell's drop handler will read this to know what piece to place.
    function handleDragStart(e: DragEvent) {
        const payload = JSON.stringify({
            pieceType: config.type,
            orientation: config.orientation,
            rotation: config.rotation,
        });
        e.dataTransfer!.setData('application/turing-piece', payload);
        e.dataTransfer!.setData(
            config.type === 'NormalGear' ? 'application/piece-gear' : 'application/piece-slot',
            ''
        );
        e.dataTransfer!.effectAllowed = 'copy';
    }
</script>

<div class="piece-icon-row">
    <!-- Draggable piece preview -->
    <!-- svelte-ignore a11y_interactive_supports_focus -->
    <div
        class="piece-icon"
        draggable="true"
        ondragstart={handleDragStart}
        title="Drag to place {config.label}"
        role="button"
    >
        <img
            src={config.svgPath}
            alt={config.label}
            style="
                transform: rotate({previewRotation()}deg) scaleX({previewFlip()});
                width: 40px;
                height: 40px;
                object-fit: contain;
                pointer-events: none;
            "
            draggable="false"
        />
    </div>

    <!-- Label + orientation toggle -->
    <div class="piece-info">
        <span class="piece-label">{config.label}</span>

        {#if isFlippable && onOrientationToggle}
            <button
                class="orientation-toggle"
                onclick={onOrientationToggle}
                title="Toggle orientation"
            >
                {config.orientation === Orientation.Left ? '◀' : '▶'}
            </button>
        {/if}
    </div>
</div>

<style>
    .piece-icon-row {
        display: flex;
        align-items: center;
        gap: 0.6rem;
        padding: 0.4rem 0.5rem;
        border-radius: 4px 7px 5px 6px / 6px 4px 7px 5px;
        transition: background 0.15s;
    }

    .piece-icon-row:hover {
        background: var(--grid-line);
    }

    .piece-icon {
        width: 50px;
        height: 50px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--cream);
        border: 2px solid var(--panel-border);
        border-radius: 4px 7px 5px 6px / 6px 4px 7px 5px;
        cursor: grab;
        transition: border-color 0.15s, box-shadow 0.12s, transform 0.1s;
        flex-shrink: 0;
        box-shadow: 2px 2px 0 var(--panel-shadow);
    }

    .piece-icon:hover {
        border-color: hsl(210, 55%, 50%);
        box-shadow: 3px 3px 0 hsl(210, 35%, 70%);
    }

    .piece-icon:active {
        cursor: grabbing;
        transform: scale(0.95);
        box-shadow: 1px 1px 0 var(--panel-shadow);
    }

    .piece-info {
        display: flex;
        flex-direction: column;
        gap: 0.3rem;
        align-items: flex-start;
    }

    .piece-label {
        font-size: 0.8rem;
        color: var(--ink);
        font-family: 'Oliver', 'Architects Daughter', cursive;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        white-space: nowrap;
    }

    .orientation-toggle {
        font-size: 0.9rem;
        padding: 0.1rem 0.35rem;
        background: var(--cream);
        border: 2px solid var(--panel-border);
        border-radius: 3px 5px 4px 5px / 5px 3px 5px 4px;
        color: var(--ink);
        cursor: pointer;
        line-height: 1;
        transition: background 0.15s, box-shadow 0.12s;
        box-shadow: 1px 1px 0 var(--panel-shadow);
    }

    .orientation-toggle:hover {
        background: var(--panel-shadow);
    }
</style>