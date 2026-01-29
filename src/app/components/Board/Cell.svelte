<script lang="ts">
    import { CellType } from '@engine/Board';
    
    let { 
        cellType,
        x,
        y,
        gridSize 
    }: {
        cellType: CellType;
        x: number;
        y: number;
        gridSize: number;
    } = $props();
    
    // Visual position
    const left = $derived(x * gridSize);
    const top = $derived(y * gridSize);
    
    // Determine cell appearance
    const cellClass = $derived(getCellClass(cellType));
    
    function getCellClass(type: CellType): string {
        switch(type) {
            case CellType.Blank: return 'blank';
            case CellType.Peg: return 'peg';
            case CellType.SlotPeg: return 'slot-peg';
            case CellType.LeftExit: return 'left-exit';
            case CellType.RightExit: return 'right-exit';
            default: return 'blank';
        }
    }
    
    // Drag & drop handlers (for piece placement)
    let isHovering = $state(false);
    
    function handleDragOver(e: DragEvent) {
        // Only allow drop on SlotPegs and Pegs (for gears)
        if (cellType === CellType.SlotPeg || cellType === CellType.Peg) {
            e.preventDefault();
            isHovering = true;
        }
    }
    
    function handleDragLeave() {
        isHovering = false;
    }
    
    function handleDrop(e: DragEvent) {
        e.preventDefault();
        isHovering = false;
        
        // Get piece type from drag data
        const pieceType = e.dataTransfer?.getData('piece-type');
        console.log(`Dropped ${pieceType} at (${x}, ${y})`);
        
        // TODO: Dispatch custom event to parent to place piece
        // For now, just log
    }
</script>

<div 
    class="cell {cellClass}"
    class:hovering={isHovering}
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
    aria-label="{cellClass} at {x}, {y}"
>
    {#if cellType === CellType.Peg}
        <div class="peg-dot"></div>
    {:else if cellType === CellType.SlotPeg}
        <div class="slot-peg-marker"></div>
    {:else if cellType === CellType.LeftExit}
        <div class="exit-arrow left">←</div>
    {:else if cellType === CellType.RightExit}
        <div class="exit-arrow right">→</div>
    {/if}
</div>

<style>
    .cell {
        position: absolute;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background-color 0.2s;
    }
    
    .blank {
        background: transparent;
    }
    
    .peg {
        background: rgba(100, 100, 100, 0.2);
    }
    
    .slot-peg {
        background: rgba(80, 120, 180, 0.15);
        border: 1px dashed rgba(100, 150, 200, 0.3);
    }
    
    .slot-peg.hovering {
        background: rgba(100, 200, 100, 0.3);
        border-color: rgba(100, 200, 100, 0.6);
    }
    
    .left-exit,
    .right-exit {
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