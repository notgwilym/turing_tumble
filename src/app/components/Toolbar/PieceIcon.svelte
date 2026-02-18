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
        e.dataTransfer!.effectAllowed = 'copy';
    }
</script>

<div class="piece-icon-row">
    <!-- Draggable piece preview -->
    <div
        class="piece-icon"
        draggable="true"
        ondragstart={handleDragStart}
        title="Drag to place {config.label}"
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
        gap: 0.75rem;
        padding: 0.5rem 0.75rem;
        border-radius: 8px;
        transition: background 0.15s;
    }

    .piece-icon-row:hover {
        background: rgba(255, 255, 255, 0.07);
    }

    .piece-icon {
        width: 52px;
        height: 52px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(255, 255, 255, 0.05);
        border: 2px solid rgba(255, 255, 255, 0.15);
        border-radius: 8px;
        cursor: grab;
        transition: border-color 0.15s, background 0.15s, transform 0.1s;
        flex-shrink: 0;
    }

    .piece-icon:hover {
        border-color: rgba(100, 150, 255, 0.6);
        background: rgba(100, 150, 255, 0.1);
    }

    .piece-icon:active {
        cursor: grabbing;
        transform: scale(0.95);
    }

    .piece-info {
        display: flex;
        flex-direction: column;
        gap: 0.3rem;
        align-items: flex-start;
    }

    .piece-label {
        font-size: 0.8rem;
        color: #ccc;
        font-weight: 500;
        white-space: nowrap;
    }

    .orientation-toggle {
        font-size: 1rem;
        padding: 0.15rem 0.4rem;
        background: rgba(100, 150, 255, 0.15);
        border: 1px solid rgba(100, 150, 255, 0.3);
        border-radius: 4px;
        color: #aac4ff;
        cursor: pointer;
        line-height: 1;
        transition: background 0.15s;
    }

    .orientation-toggle:hover {
        background: rgba(100, 150, 255, 0.3);
    }
</style>