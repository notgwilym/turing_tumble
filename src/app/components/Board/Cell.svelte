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
        transition: background-color 0.15s;
    }

    .blank    { background: transparent; }
    .peg      { background: rgba(100, 100, 100, 0.2); }

    .slot-peg {
        background: rgba(80, 120, 180, 0.15);
        border: 1px dashed rgba(100, 150, 200, 0.3);
    }

    /* ── Valid hover: green highlight across entire cell ── */
    .slot-peg.hovering-valid {
        background: rgba(100, 220, 100, 0.25);
        border-color: rgba(100, 220, 100, 0.7);
        border-style: solid;
    }

    .peg.hovering-valid {
        background: rgba(100, 220, 100, 0.25);
        outline: 2px solid rgba(100, 220, 100, 0.5);
    }

    /* ── Invalid hover on a Peg/SlotPeg: prohibited indicator ── */
    .hovering-invalid {
        background: rgba(220, 60, 60, 0.1);
    }
    .hovering-invalid::after {
        content: '';
        position: absolute;
        width: 18px;
        height: 18px;
        border-radius: 50%;
        border: 2px solid rgba(220, 60, 60, 0.6);
        /* Diagonal line through circle */
        background:
            linear-gradient(
                to top right,
                transparent calc(50% - 1px),
                rgba(220, 60, 60, 0.6) calc(50% - 1px),
                rgba(220, 60, 60, 0.6) calc(50% + 1px),
                transparent calc(50% + 1px)
            );
    }

    /* Blanks and exits: no indicator at all when hovered during drag */

    .left-exit, .right-exit {
        background: rgba(200, 100, 50, 0.2);
    }

    .peg-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #666;
    }

    .slot-peg-marker {
        width: 12px;
        height: 12px;
        border: 2px solid #4a90e2;
        border-radius: 50%;
        opacity: 0.5;
    }

    .exit-arrow {
        font-size: 1.5rem;
        color: #ff6b35;
        opacity: 0.6;
    }
</style>