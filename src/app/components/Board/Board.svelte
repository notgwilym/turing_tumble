<script lang="ts">
    import { CellType } from '@engine/Board';
    import type { Piece } from '@engine/pieces/Piece';
    import type { Ball } from '@engine/Ball';

    import BoardGrid from './BoardGrid.svelte';
    import PiecesLayer from './PiecesLayer.svelte';
    import BallsLayer from './BallsLayer.svelte';

    const {
        board,
        pieces,
        activeBalls,
        gridSize = 60,
        globalScale,
        onPieceDrop,
        onPieceToggle,
        onPieceRemove,
    } = $props<{
        board: CellType[][];
        pieces: (Piece | null)[][];
        activeBalls: Ball[];
        gridSize?: number;
        globalScale: number;
        onPieceDrop?: (x: number, y: number, payload: string) => void;
        onPieceToggle?: (x: number, y: number) => void;
        onPieceRemove?: (x: number, y: number) => void;
    }>();

    const boardWidth  = $derived(board[0]?.length * gridSize || 0);
    const boardHeight = $derived(board.length * gridSize || 0);

    // ─── Drag arrow state ────────────────────────────────────────────────────

    let dragOrigin = $state<{ x: number; y: number } | null>(null);
    let dragMouse  = $state<{ x: number; y: number } | null>(null);

    // Cell coordinates of the drag hover position (null if not dragging)
    const dragHoverCell = $derived.by(() => {
        if (!dragMouse) return null;
        return {
            x: Math.floor(dragMouse.x / gridSize),
            y: Math.floor(dragMouse.y / gridSize),
        };
    });

    // Cell coordinates of the drag origin (so the source piece doesn't dim itself)
    const dragOriginCell = $derived.by(() => {
        if (!dragOrigin) return null;
        return {
            x: Math.floor(dragOrigin.x / gridSize),
            y: Math.floor(dragOrigin.y / gridSize),
        };
    });

    let boardEl: HTMLDivElement | undefined = $state();

    function handlePieceDragStart(cellX: number, cellY: number) {
        dragOrigin = {
            x: cellX * gridSize + gridSize / 2,
            y: cellY * gridSize + gridSize / 2,
        };
    }

    function handlePieceDragEnd() {
        dragOrigin = null;
        dragMouse = null;
    }

    // ─── Board-level dragover (for arrow tracking) ───────────────────────────

    function handleBoardDragOver(e: DragEvent) {
        // Accept drops so the board is a valid drop zone
        e.preventDefault();
        const effect = e.dataTransfer!.effectAllowed;
        e.dataTransfer!.dropEffect = effect === 'move' ? 'move' : 'copy';

        if (!dragOrigin || !boardEl) return;
        const rect = boardEl.getBoundingClientRect();
        dragMouse = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
        };
    }

    // ─── Board-level drop (catch-all for drops that miss cells) ──────────────
    // If a drop lands on a PieceSprite (which has no ondrop), the event bubbles
    // here. We calculate the target cell from cursor position and handle it.
    // Cell.svelte calls stopPropagation on successful drops, so this only fires
    // for drops that bypass cells.

    function handleBoardDrop(e: DragEvent) {
        e.preventDefault();
        if (!boardEl || !onPieceDrop) return;

        const rect = boardEl.getBoundingClientRect();
        const gridX = Math.floor((e.clientX - rect.left) / gridSize);
        const gridY = Math.floor((e.clientY - rect.top) / gridSize);

        // Bounds check
        if (gridY < 0 || gridY >= board.length || gridX < 0 || gridX >= board[0].length) return;

        // Valid cell check
        const cellType = board[gridY][gridX];
        if (cellType !== CellType.SlotPeg && cellType !== CellType.Peg) return;

        const payload = e.dataTransfer?.getData('application/turing-piece');
        if (!payload) return;

        onPieceDrop(gridX, gridY, payload);
    }

    // ─── Arrow geometry ──────────────────────────────────────────────────────

    const ARROW_HEAD_SIZE = 10;
    const ARROW_STROKE = 2;

    const arrowPath = $derived.by(() => {
        if (!dragOrigin || !dragMouse) return null;

        const dx = dragMouse.x - dragOrigin.x;
        const dy = dragMouse.y - dragOrigin.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len < 8) return null;

        const ux = dx / len;
        const uy = dy / len;

        const tipX = dragMouse.x;
        const tipY = dragMouse.y;
        const baseX = tipX - ux * ARROW_HEAD_SIZE;
        const baseY = tipY - uy * ARROW_HEAD_SIZE;

        const px = -uy * ARROW_HEAD_SIZE * 0.5;
        const py =  ux * ARROW_HEAD_SIZE * 0.5;

        return {
            lineX1: dragOrigin.x,
            lineY1: dragOrigin.y,
            lineX2: baseX,
            lineY2: baseY,
            headPoints: `${tipX},${tipY} ${baseX + px},${baseY + py} ${baseX - px},${baseY - py}`,
        };
    });
</script>

<div
    class="board-container"
    data-board-container
    style="width: {boardWidth}px; height: {boardHeight}px;"
    bind:this={boardEl}
    ondragover={handleBoardDragOver}
    ondrop={handleBoardDrop}
>
    <BoardGrid {board} {gridSize} {onPieceDrop} />
    <PiecesLayer
        {pieces}
        {gridSize}
        {globalScale}
        onToggle={onPieceToggle}
        onRemove={onPieceRemove}
        onDragStart={handlePieceDragStart}
        onDragEnd={handlePieceDragEnd}
        {dragHoverCell}
        {dragOriginCell}
    />
    <BallsLayer {activeBalls} {gridSize} />

    {#if arrowPath}
        <svg class="arrow-overlay" viewBox="0 0 {boardWidth} {boardHeight}">
            <line
                x1={arrowPath.lineX1}
                y1={arrowPath.lineY1}
                x2={arrowPath.lineX2}
                y2={arrowPath.lineY2}
                stroke="rgba(255, 255, 255, 0.5)"
                stroke-width={ARROW_STROKE}
                stroke-linecap="round"
            />
            <polygon
                points={arrowPath.headPoints}
                fill="rgba(255, 255, 255, 0.5)"
            />
        </svg>
    {/if}
</div>

<style>
    .board-container {
        position: relative;
        margin: 2rem auto;
        border: 3px solid #333;
        border-radius: 8px;
        background: #1a1a1a;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    }

    .arrow-overlay {
        position: absolute;
        inset: 0;
        z-index: 10;
        pointer-events: none;
        overflow: visible;
    }
</style>