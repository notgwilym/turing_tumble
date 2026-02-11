<script lang="ts">
    import type { CellType } from '@engine/Board';
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
        onPieceDrop,
        onPieceToggle,
        onPieceRemove,
    } = $props<{
        board: CellType[][];
        pieces: (Piece | null)[][];
        activeBalls: Ball[];
        gridSize?: number;
        onPieceDrop?: (x: number, y: number, payload: string) => void;
        onPieceToggle?: (x: number, y: number) => void;
        onPieceRemove?: (x: number, y: number) => void;
    }>();

    const boardWidth  = $derived(board[0]?.length * gridSize || 0);
    const boardHeight = $derived(board.length * gridSize || 0);
</script>

<div
    class="board-container"
    style="width: {boardWidth}px; height: {boardHeight}px;"
>
    <BoardGrid {board} {gridSize} {onPieceDrop} />
    <PiecesLayer {pieces} {gridSize} onToggle={onPieceToggle} onRemove={onPieceRemove} />
    <BallsLayer {activeBalls} {gridSize} />
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
</style>