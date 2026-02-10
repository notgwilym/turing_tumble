<script lang="ts">
    import { Engine } from '../engine/Engine';
    import { CellType } from '../engine/Board';
    import { FlippablePiece, Orientation } from '../engine/pieces/Piece';
    import { Bit } from '../engine/pieces/Bit';
    import { Ramp } from '../engine/pieces/Ramp';
    import { Crossover } from '../engine/pieces/Crossover';
    import { Interceptor } from '../engine/pieces/Interceptor';
    import { GearBit, NormalGear, GearRotation } from '../engine/pieces/Gear';

    import type { Ball } from '../engine/Ball';
    import type { Piece } from '../engine/pieces/Piece';

    import Board from './components/Board/Board.svelte';
    import GameControls from './components/Controls/GameControls.svelte';
    import StatusDisplay from './components/Controls/StatusDisplay.svelte';
    import PieceToolbar from './components/Toolbar/PieceToolbar.svelte';

    let engine = new Engine();

    let gameState = $state({
        tick: 0,
        engineState: 'INIT',
        board: [] as CellType[][],
        pieces: [] as (Piece | null)[][],
        leftQueueCount: 0,
        rightQueueCount: 0,
        activeBalls: [] as Ball[],
        finishedBalls: [] as Ball[],
        stateString: '',
    });

    let placementError = $state<string | null>(null);
    let errorTimeout: ReturnType<typeof setTimeout> | null = null;

    const GRID_SIZE = 60;
    let showDebug = $state(false);

    $effect(() => {
        syncFromEngine();
        const unsubscribe = engine.subscribe(() => syncFromEngine());
        return unsubscribe;
    });

    function syncFromEngine() {
        gameState = {
            tick: engine.getCurrentTick(),
            engineState: engine.getState(),
            leftQueueCount: engine.getQueueCounts().left,
            rightQueueCount: engine.getQueueCounts().right,
            stateString: engine.getStateString(),
            activeBalls: engine.getActiveBalls().map(b => b.clone()),
            finishedBalls: engine.getFinishedBalls().map(b => b.clone()),
            board: engine.getBoard().getGrid().map(row => [...row]),
            pieces: engine.getBoard().getPieceGrid().map(row =>
                row.map(p => p ? p.clone() : null)
            ),
        };
    }

    function step() { engine.step(); }

    // ─── Drop: toolbar→board (copy) or board→board (move) ────────────────────
    //
    // The payload always carries pieceType + orientation/rotation.
    // Board-origin drags additionally carry fromX/fromY, making this a move:
    //   1. Remove piece from its old cell (handles gear-set cleanup in Board).
    //   2. If target cell is already occupied, remove that piece too (avoids
    //      silent overwrites that would orphan gear-set entries).
    //   3. Place fresh piece at new coordinates.

    function handlePieceDrop(toX: number, toY: number, payloadJson: string) {
        try {
            const { pieceType, orientation, rotation, fromX, fromY } = JSON.parse(payloadJson) as {
                pieceType: string;
                orientation?: Orientation;
                rotation?: GearRotation;
                fromX?: number;
                fromY?: number;
            };

            const isMove = fromX !== undefined && fromY !== undefined;

            // No-op if dropped back on the same cell
            if (isMove && fromX === toX && fromY === toY) return;

            // For moves, remove from origin first
            if (isMove) engine.removePiece(fromX!, fromY!);

            // If target is occupied, clear it before placing
            const existing = engine.getBoard().getPieceAt(toX, toY);
            if (existing) engine.removePiece(toX, toY);

            const piece = createPiece(pieceType, toX, toY, orientation, rotation);
            if (piece) engine.addPiece(piece);

            showError(null);
        } catch (err) {
            showError(err instanceof Error ? err.message : String(err));
        }
    }

    // ─── Click on board piece: flip orientation ───────────────────────────────
    //
    // FlippablePiece.flip() mutates the piece in-place, but since gameState
    // is a snapshot we can't just call flip() on the clone.  Instead we:
    //   1. Get the live piece from the engine's board.
    //   2. Clone it, flip the clone, then remove-old / add-new via the engine
    //      so the engine's notify() fires and the UI re-syncs.

    function handlePieceFlip(x: number, y: number) {
        try {
            const piece = engine.getBoard().getPieceAt(x, y);
            if (!piece || !(piece instanceof FlippablePiece)) return;

            const flipped = piece.clone() as FlippablePiece;
            flipped.flip();

            engine.removePiece(x, y);
            engine.addPiece(flipped);
        } catch (err) {
            showError(err instanceof Error ? err.message : String(err));
        }
    }

    // ─── Drag off board: delete ───────────────────────────────────────────────
    // Triggered by PieceSprite.dragend when dropEffect === 'none',
    // meaning the drag ended outside any valid drop target.

    function handlePieceRemove(x: number, y: number) {
        try {
            engine.removePiece(x, y);
        } catch (err) {
            showError(err instanceof Error ? err.message : String(err));
        }
    }

    // ─── Clear board ──────────────────────────────────────────────────────────
    // Iterate the piece grid snapshot and remove every occupied cell.

    function clearBoard() {
        const grid = engine.getBoard().getPieceGrid();
        for (let y = 0; y < grid.length; y++) {
            for (let x = 0; x < grid[y].length; x++) {
                if (grid[y][x] !== null) {
                    engine.removePiece(x, y);
                }
            }
        }
    }

    // ─── Piece factory ────────────────────────────────────────────────────────

    function createPiece(
        type: string,
        x: number,
        y: number,
        orientation?: Orientation,
        rotation?: GearRotation,
    ): Piece | null {
        const ori = orientation ?? Orientation.Right;
        const rot = rotation ?? GearRotation.Counterclockwise;
        switch (type) {
            case 'bit':
            case 'Bit':         return new Bit(x, y, ori);
            case 'ramp':
            case 'Ramp':        return new Ramp(x, y, ori);
            case 'crossover':
            case 'Crossover':   return new Crossover(x, y);
            case 'interceptor':
            case 'Interceptor': return new Interceptor(x, y);
            case 'NormalGear':
            case 'gear':        return new NormalGear(x, y);
            case 'GearBit':
            case 'gearbit':     return new GearBit(x, y, rot);
            default:
                console.warn('Unknown piece type:', type);
                return null;
        }
    }

    function showError(msg: string | null) {
        placementError = msg;
        if (errorTimeout) clearTimeout(errorTimeout);
        if (msg) errorTimeout = setTimeout(() => { placementError = null; }, 3000);
    }

    // ─── Initial board setup ──────────────────────────────────────────────────

    function setupGearTest() {
        engine.addPiece(new GearBit(3, 0, GearRotation.Counterclockwise));
        engine.addPiece(new NormalGear(3, 1));
        engine.addPiece(new GearBit(2, 1, GearRotation.Counterclockwise));
        engine.addPiece(new Ramp(4, 1, Orientation.Left));
        engine.addPiece(new Crossover(3, 2));
        engine.addPiece(new Ramp(2, 3, Orientation.Left));
        engine.addPiece(new Ramp(1, 4, Orientation.Right));
        engine.addPiece(new Ramp(2, 5, Orientation.Left));
        engine.addPiece(new Crossover(1, 6));
        engine.addPiece(new Ramp(0, 7, Orientation.Right));
        engine.addPiece(new Ramp(1, 8, Orientation.Right));
        engine.addPiece(new Ramp(2, 9, Orientation.Left));
        engine.addPiece(new Bit(4, 3, Orientation.Right));
        engine.addPiece(new Ramp(5, 4, Orientation.Right));
        engine.addPiece(new Ramp(6, 5, Orientation.Right));
        engine.addPiece(new Ramp(7, 6, Orientation.Left));
        engine.addPiece(new Ramp(6, 7, Orientation.Right));
        engine.addPiece(new Ramp(7, 8, Orientation.Left));
        engine.addPiece(new Ramp(6, 9, Orientation.Right));
        engine.addPiece(new Ramp(3, 4, Orientation.Left));
        engine.addPiece(new Ramp(7, 0, Orientation.Left));
        engine.addPiece(new Ramp(6, 1, Orientation.Left));
        engine.addPiece(new Ramp(5, 2, Orientation.Left));
    }

    setupGearTest();
</script>

<main>
    <div class="app-layout">
        <PieceToolbar onClearBoard={clearBoard} />

        <div class="center-column">
            <div class="controls-section">
                <GameControls
                    onStep={step}
                    engineState={gameState.engineState}
                />
                <StatusDisplay
                    tick={gameState.tick}
                    engineState={gameState.engineState}
                    leftQueueCount={gameState.leftQueueCount}
                    rightQueueCount={gameState.rightQueueCount}
                />
            </div>

            {#if placementError}
                <div class="error-toast" role="alert">⚠️ {placementError}</div>
            {/if}

            <div class="board-display">
                <Board
                    board={gameState.board}
                    pieces={gameState.pieces}
                    activeBalls={gameState.activeBalls}
                    gridSize={GRID_SIZE}
                    onPieceDrop={handlePieceDrop}
                    onPieceFlip={handlePieceFlip}
                    onPieceRemove={handlePieceRemove}
                />
            </div>

            <div class="debug-section">
                <button onclick={() => showDebug = !showDebug} class="debug-toggle">
                    {showDebug ? 'Hide' : 'Show'} Debug Info
                </button>
                {#if showDebug}
                    <div class="state-display">
                        <pre>{gameState.stateString}</pre>
                    </div>
                {/if}
            </div>
        </div>
    </div>
</main>

<style>
    main {
        max-width: 1400px;
        margin: 0 auto;
        padding: 2rem;
    }

    .app-layout {
        display: flex;
        gap: 2rem;
        align-items: flex-start;
        justify-content: center;
    }

    .center-column {
        display: flex;
        flex-direction: column;
        align-items: center;
        flex: 1;
    }

    .controls-section {
        display: flex;
        gap: 2rem;
        justify-content: center;
        align-items: center;
        margin-bottom: 1rem;
        flex-wrap: wrap;
    }

    .board-display {
        display: flex;
        justify-content: center;
    }

    .error-toast {
        background: rgba(220, 60, 60, 0.85);
        color: #fff;
        padding: 0.5rem 1.2rem;
        border-radius: 6px;
        font-size: 0.875rem;
        margin-bottom: 0.5rem;
        animation: fadeIn 0.2s ease;
    }

    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(-6px); }
        to   { opacity: 1; transform: translateY(0); }
    }

    .debug-section { margin-top: 1.5rem; }

    .debug-toggle {
        padding: 0.5rem 1rem;
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 4px;
        color: #fff;
        cursor: pointer;
    }

    .debug-toggle:hover { background: rgba(255, 255, 255, 0.2); }

    .state-display {
        margin-top: 1rem;
        padding: 1rem;
        background-color: #1a1a1a;
        border: 1px solid #333;
        border-radius: 4px;
        overflow-x: auto;
        text-align: left;
    }

    pre {
        margin: 0;
        font-family: 'Courier New', monospace;
        font-size: 0.8rem;
        line-height: 1.4;
        color: #e0e0e0;
    }
</style>