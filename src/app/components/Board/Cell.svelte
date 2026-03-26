<script lang="ts">
    import { CellType } from '@engine/Board';

    let {
        cellType,
        x,
        y,
        gridSize,
        onPieceDrop,
    }: {
        cellType: CellType;
        x: number;
        y: number;
        gridSize: number;
        onPieceDrop?: (x: number, y: number, payload: string) => void;
    } = $props();

    const left = $derived(x * gridSize);
    const top  = $derived(y * gridSize);
    const cellClass = $derived(getCellClass(cellType));

    function getCellClass(type: CellType): string {
        switch (type) {
            case CellType.Blank:     return 'blank';
            case CellType.Peg:       return 'peg';
            case CellType.SlotPeg:   return 'slot-peg';
            case CellType.LeftExit:  return 'left-exit';
            case CellType.RightExit: return 'right-exit';
            default: return 'blank';
        }
    }

    /** Is this cell a potential drop target at all? (Peg or SlotPeg) */
    const isPegOrSlot = $derived(
        cellType === CellType.SlotPeg || cellType === CellType.Peg
    );

    let isHovering = $state(false);
    let isValidForDraggedPiece = $state(false);

    // ALL cells accept dragover so the entire board is a drop zone.
    // But we determine validity per-piece using MIME type markers.
    function handleDragOver(e: DragEvent) {
        e.preventDefault();
        const effect = e.dataTransfer!.effectAllowed;
        e.dataTransfer!.dropEffect = effect === 'move' ? 'move' : 'copy';

        isHovering = true;

        // Determine validity based on piece category + cell type
        const types = e.dataTransfer!.types;
        console.log('TYPES:', JSON.stringify(Array.from(types)));

        const isGearPiece = Array.from(types).includes('application/piece-gear');
        // const isSlotPiece = types.includes('application/piece-slot');

        if (isGearPiece) {
            // NormalGear: valid on Peg or SlotPeg
            isValidForDraggedPiece = cellType === CellType.Peg || cellType === CellType.SlotPeg;
        } else {
            // Everything else: valid on SlotPeg only
            isValidForDraggedPiece = cellType === CellType.SlotPeg;
        }
    }

    function handleDragLeave() {
        isHovering = false;
        isValidForDraggedPiece = false;
    }

    function handleDrop(e: DragEvent) {
        e.preventDefault();
        isHovering = false;
        isValidForDraggedPiece = false;

        // Only place on valid targets
        if (!isPegOrSlot || !onPieceDrop) return;

        const payload = e.dataTransfer?.getData('application/turing-piece');
        if (!payload) return;

        e.stopPropagation(); // prevent Board catch-all from double-firing
        onPieceDrop(x, y, payload);
    }
</script>

<div
    class="cell {cellClass}"
    class:hovering-valid={isHovering && isValidForDraggedPiece}
    class:hovering-invalid={isHovering && !isValidForDraggedPiece && isPegOrSlot}
    style="
        left: {left}px;
        top: {top}px;
        width: {gridSize}px;
        height: {gridSize}px;
    "
    ondragover={handleDragOver}
    ondragleave={handleDragLeave}
    ondrop={handleDrop}
    role="gridcell"
    tabindex="0"
    aria-label="{cellClass} at {x}, {y}"
>
    {#if cellType === CellType.Peg}
        <div class="peg-dot"></div>
    {:else if cellType === CellType.SlotPeg}
        <div class="slot-peg-marker"></div>
    {:else if cellType === CellType.LeftExit}
        <div class="exit-arrow">←</div>
    {:else if cellType === CellType.RightExit}
        <div class="exit-arrow">→</div>
    {/if}
</div>

<style>
    .cell {
        position: absolute;
        display: flex;
        align-items: center;
        justify-content: center;
        background: transparent;
    }

    /* ── Hover states ── */
    .slot-peg.hovering-valid  { background: hsla(130, 55%, 50%, 0.18); }
    .peg.hovering-valid       { background: hsla(130, 55%, 50%, 0.18); }
    .hovering-invalid         { background: hsla(8, 70%, 55%, 0.12); }

    .hovering-invalid::after {
        content: '';
        position: absolute;
        width: 18px;
        height: 18px;
        border-radius: 50%;
        border: 2px solid hsla(8, 65%, 50%, 0.55);
        background: linear-gradient(
            to top right,
            transparent calc(50% - 1px),
            hsla(8, 65%, 50%, 0.55) calc(50% - 1px),
            hsla(8, 65%, 50%, 0.55) calc(50% + 1px),
            transparent calc(50% + 1px)
        );
    }

    /* ── Peg markers ── */
    .peg-dot {
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: var(--ink-mid);
        opacity: 0.7;
    }

    .slot-peg-marker {
        width: 18px;
        height: 18px;
        border: 2px dashed var(--panel-border);
        border-radius: 50%;
    }

    .left-exit  { background: hsl(229, 44%, 49%); }
    .right-exit { background: hsl(0, 100%, 71%); }

    .exit-arrow {
        font-size: 1.3rem;
        color: hsl(44, 100%, 96%);
        opacity: 0.9;
        user-select: none;
    }
</style>