<script lang="ts">
    import { CellType } from '@engine/Board';
    import type { Piece } from '@engine/pieces/Piece';
    import type { Ball } from '@engine/Ball';

    import BoardGrid from './BoardGrid.svelte';
    import PiecesLayer from './PiecesLayer.svelte';
    import BallsLayer from './BallsLayer.svelte';
    import type { AnimBallState, AnimPieceState } from '../Animation/AnimationController';

    const {
        board,
        pieces,
        activeBalls,
        gridSize = 60,
        globalScale,
        onPieceDrop,
        onPieceToggle,
        onPieceRemove,
        animBall = null,
        animPieceStates = null,
        disableInteraction = false,
    } = $props<{
        board: CellType[][];
        pieces: (Piece | null)[][];
        activeBalls: Ball[];
        gridSize?: number;
        globalScale: number;
        onPieceDrop?: (x: number, y: number, payload: string) => void;
        onPieceToggle?: (x: number, y: number) => void;
        onPieceRemove?: (x: number, y: number) => void;
        /** Animated ball state from AnimationController — hides engine balls when set */
        animBall?: AnimBallState | null;
        /** Animated piece states from AnimationController — keyed by "col,row" */
        animPieceStates?: Map<string, AnimPieceState> | null;
        /** Disable drag-and-drop and toggle interactions during animation */
        disableInteraction?: boolean;
    }>();

    const boardWidth  = $derived(board[0]?.length * gridSize || 0);
    const boardHeight = $derived(board.length * gridSize || 0);

    type Seg = { x1: number; y1: number; x2: number; y2: number };

    function computeGroupEdges(board: CellType[][], gridSize: number, matchType: CellType): Seg[] {
        const segs: Seg[] = [];
        for (let r = 0; r < board.length; r++) {
            for (let c = 0; c < board[r].length; c++) {
                if (board[r][c] !== matchType) continue;
                const x = c * gridSize, y = r * gridSize;
                const diff = (dr: number, dc: number) => {
                    const nr = r + dr, nc = c + dc;
                    return nr < 0 || nr >= board.length || nc < 0 || nc >= board[r].length
                        || board[nr][nc] !== matchType;
                };
                if (diff(-1,  0)) segs.push({ x1: x,           y1: y,            x2: x + gridSize, y2: y            });
                if (diff( 1,  0)) segs.push({ x1: x,           y1: y + gridSize, x2: x + gridSize, y2: y + gridSize });
                if (diff( 0, -1)) segs.push({ x1: x,           y1: y,            x2: x,            y2: y + gridSize });
                if (diff( 0,  1)) segs.push({ x1: x + gridSize, y1: y,           x2: x + gridSize, y2: y + gridSize });
            }
        }
        return segs;
    }

    // Compute the outline edge segments that border active (non-blank) cells only
    const outlineEdges = $derived.by(() => {
        const segs: { x1: number; y1: number; x2: number; y2: number }[] = [];
        for (let r = 0; r < board.length; r++) {
            for (let c = 0; c < board[r].length; c++) {
                if (board[r][c] === CellType.Blank) continue;
                const x = c * gridSize;
                const y = r * gridSize;
                const neighbourBlank = (dr: number, dc: number) => {
                    const nr = r + dr, nc = c + dc;
                    return nr < 0 || nr >= board.length || nc < 0 || nc >= board[r].length
                        || board[nr][nc] === CellType.Blank;
                };
                if (neighbourBlank(-1, 0)) segs.push({ x1: x,            y1: y,            x2: x + gridSize, y2: y            });
                if (neighbourBlank( 1, 0)) segs.push({ x1: x,            y1: y + gridSize, x2: x + gridSize, y2: y + gridSize });
                if (neighbourBlank( 0,-1)) segs.push({ x1: x,            y1: y,            x2: x,            y2: y + gridSize });
                if (neighbourBlank( 0, 1)) segs.push({ x1: x + gridSize, y1: y,            x2: x + gridSize, y2: y + gridSize });
            }
        }
        return segs;
    });

    const leftExitEdges  = $derived(computeGroupEdges(board, gridSize, CellType.LeftExit));
    const rightExitEdges = $derived(computeGroupEdges(board, gridSize, CellType.RightExit));

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
    <BoardGrid {board} {gridSize} onPieceDrop={disableInteraction ? undefined : onPieceDrop} />
    <PiecesLayer
        {pieces}
        {gridSize}
        {globalScale}
        onToggle={disableInteraction ? undefined : onPieceToggle}
        onRemove={disableInteraction ? undefined : onPieceRemove}
        onDragStart={disableInteraction ? undefined : handlePieceDragStart}
        onDragEnd={disableInteraction ? undefined : handlePieceDragEnd}
        {dragHoverCell}
        {dragOriginCell}
        {animPieceStates}
    />
    <BallsLayer {activeBalls} {gridSize} {animBall} />

    <svg class="board-overlay" viewBox="0 0 {boardWidth} {boardHeight}">
        <!-- Active-area outline -->
        {#each outlineEdges as seg}
            <line x1={seg.x1} y1={seg.y1} x2={seg.x2} y2={seg.y2}
                stroke="var(--panel-border)" stroke-width="2" stroke-linecap="square" />
        {/each}

        <!-- Left-exit group border -->
        {#each leftExitEdges as seg}
            <line x1={seg.x1} y1={seg.y1} x2={seg.x2} y2={seg.y2}
                stroke="hsl(229, 55%, 35%)" stroke-width="2.5" stroke-linecap="square" />
        {/each}

        <!-- Right-exit group border -->
        {#each rightExitEdges as seg}
            <line x1={seg.x1} y1={seg.y1} x2={seg.x2} y2={seg.y2}
                stroke="hsl(0, 75%, 50%)" stroke-width="2.5" stroke-linecap="square" />
        {/each}

        <!-- Drag arrow -->
        {#if arrowPath}
            <line
                x1={arrowPath.lineX1}
                y1={arrowPath.lineY1}
                x2={arrowPath.lineX2}
                y2={arrowPath.lineY2}
                stroke="hsla(25, 45%, 22%, 0.5)"
                stroke-width={ARROW_STROKE}
                stroke-linecap="round"
            />
            <polygon
                points={arrowPath.headPoints}
                fill="hsla(25, 45%, 22%, 0.5)"
            />
        {/if}
    </svg>
</div>

<style>
    .board-container {
        position: relative;
        margin: 1rem auto;
        background: transparent;
    }

    .board-overlay {
        position: absolute;
        inset: 0;
        z-index: 10;
        pointer-events: none;
        overflow: visible;
    }
</style>