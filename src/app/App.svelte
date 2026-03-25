<script lang="ts">
    import { Engine } from '../engine/Engine';
    import { CellType } from '../engine/Board';
    import { Orientation } from '../engine/pieces/Piece';
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

    import AnimationTestPage from './components/Animation/AnimationTestPage.svelte';
    import { DEFAULT_GLOBAL_SCALE } from './components/Animation/PieceAnimConfig';
    import { AnimationController, type AnimBallState, type AnimPieceState } from './components/Animation/AnimationController';

    let showTestPage = $state(false);

    let engine = new Engine();

    // ─── Animation state ──────────────────────────────────────────────────────

    let animController: AnimationController | null = null;
    let animBall = $state<AnimBallState | null>(null);
    let animPieceStates = $state<Map<string, AnimPieceState>>(new Map());
    let isAnimating = $state(false);
    let animIsPaused = $state(false);
    let animTick = $state(0);
    let animLeftQueueCount = $state(0);
    let animRightQueueCount = $state(0);
    let animQueueCountsAtDelta: { left: number; right: number }[] = [];
    let setupSnapshot: (Piece | null)[][] | null = null;

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
    const GLOBAL_SCALE = DEFAULT_GLOBAL_SCALE;  // or make it reactive: let globalScale = $state(DEFAULT_GLOBAL_SCALE);
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

    function step() {
        if (isAnimating) {
            const targetTick = animController!.currentTick;
            handleStop(); // kills animation, engine returns to SETUP
            // Snapshot the clean board before any stepping
            setupSnapshot = engine.getBoard().getPieceGrid()
                .map(row => row.map(p => p ? p.clone() : null));
            // Fast-forward engine to match where the animation was paused
            while (engine.getCurrentTick() < targetTick) {
                engine.step();
            }
            // Now do the user's actual step from that position
            engine.step();
            return;
        }
        if (setupSnapshot === null) {
            setupSnapshot = engine.getBoard().getPieceGrid()
                .map(row => row.map(p => p ? p.clone() : null));
        }
        engine.step();
    }

    // ─── Animation handlers ───────────────────────────────────────────────────

    function handlePlay() {
        if (isAnimating && animIsPaused) {
            animController?.play();
            animIsPaused = false;
            return;
        }

        // If the engine was advanced by stepping, restore it before animating
        if (engine.getState() !== 'SETUP') {
            engine.reset(setupSnapshot ?? undefined);
            setupSnapshot = null;
        }

        // Pre-compute the full simulation from current board state
        let deltas;
        try {
            deltas = engine.runToCompletion();
        } catch (err) {
            showError(err instanceof Error ? err.message : String(err));
            return;
        }

        if (deltas.length === 0) {
            showError('No moves to animate (is the board empty?)');
            return;
        }

        // Pre-compute queue counts at each delta index
        {
            const counts = engine.getQueueCounts();
            let left = counts.left;
            let right = counts.right;
            animQueueCountsAtDelta = [];
            for (let i = 0; i < deltas.length; i++) {
                // A new ball is consumed at the first delta and after any delta where
                // the ball exited (nextPieceType === null means no next piece → exit cell next)
                if (i === 0 || deltas[i - 1].nextPieceType === null) {
                    if (deltas[i].ball.colour === 'red') left = Math.max(0, left - 1);
                    else right = Math.max(0, right - 1);
                }
                animQueueCountsAtDelta.push({ left, right });
            }
        }

        // Snapshot initial pieces for virtualRotation initialisation
        const initialPieces = engine.getBoard().getPieceGrid().map(row => row.map(p => p ? p.clone() : null));

        // Tear down any existing controller
        animController?.dispose();

        animController = new AnimationController(
            deltas,
            initialPieces,
            GRID_SIZE,
            GLOBAL_SCALE,
            () => {
                if (!animController) return;
                animBall = animController.ballPos;
                animTick = animController.currentTick;
                const qc = animQueueCountsAtDelta[animController.currentDeltaIndex];
                if (qc) { animLeftQueueCount = qc.left; animRightQueueCount = qc.right; }
                if (animController.isComplete) {
                    // Revert pieces to engine state rather than leaving them at anim-end positions
                    animPieceStates = new Map();
                    isAnimating = false;
                    animIsPaused = false;
                } else {
                    // Force Svelte reactivity by creating a new Map reference
                    animPieceStates = new Map(animController.pieceAnimStates);
                    isAnimating = true;
                }
            },
        );

        animController.prime();
        isAnimating = true;
        animIsPaused = false;
        animController.play();
    }

    function handlePause() {
        if (!isAnimating) return;
        animController?.pause();
        animIsPaused = true;
    }

    function handleStop() {
        animController?.dispose();
        animController = null;
        animBall = null;
        animTick = 0;
        animPieceStates = new Map();
        isAnimating = false;
        animIsPaused = false;
        if (setupSnapshot !== null) {
            engine.reset(setupSnapshot);
            setupSnapshot = null;
        }
    }

    // ─── Drop: toolbar→board (copy) or board→board (move) ────────────────────
    //
    // Payload always has pieceType + orientation/rotation.
    // fromX/fromY present → board-origin move:
    //   1. Remove from origin (handles gear-set cleanup).
    //   2. Remove any existing piece at target (avoids orphaned gear-set entries).
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
        if (isMove && fromX === toX && fromY === toY) return; // dropped on itself

        if (isMove) engine.removePiece(fromX!, fromY!);

        try {
            const existing = engine.getBoard().getPieceAt(toX, toY);
            if (existing) engine.removePiece(toX, toY);

            const piece = createPiece(pieceType, toX, toY, orientation, rotation);
            if (piece) engine.addPiece(piece);

            showError(null);
        } catch (placeErr) {
            // Placement failed — restore piece at origin if it was a move
            if (isMove) {
                const restored = createPiece(pieceType, fromX!, fromY!, orientation, rotation);
                if (restored) engine.addPiece(restored);
            }
            showError(placeErr instanceof Error ? placeErr.message : String(placeErr));
        }
    } catch (err) {
        showError(err instanceof Error ? err.message : String(err));
    }
}

    // ─── Toggle: flip (Bit/Ramp) or turn gear set (GearBit) ──────────────────
    //
    // Engine.togglePiece handles the different mechanics for each piece type.
    // The UI just forwards the (x, y) — no type-checking here.

    function handlePieceToggle(x: number, y: number) {
        try {
            engine.togglePiece(x, y);
        } catch (err) {
            showError(err instanceof Error ? err.message : String(err));
        }
    }

    // ─── Remove: drag off board ───────────────────────────────────────────────

    function handlePieceRemove(x: number, y: number) {
        try {
            engine.removePiece(x, y);
        } catch (err) {
            showError(err instanceof Error ? err.message : String(err));
        }
    }

    // ─── Clear board ──────────────────────────────────────────────────────────

    function clearBoard() {
        const grid = engine.getBoard().getPieceGrid();
        for (let y = 0; y < grid.length; y++) {
            for (let x = 0; x < grid[y].length; x++) {
                if (grid[y][x] !== null) engine.removePiece(x, y);
            }
        }
    }

    // ─── Piece factory ────────────────────────────────────────────────────────
    // Handles both lowercase keys (from board drags via getPieceType())
    // and PascalCase keys (from toolbar PieceConfig.type).

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
            case 'Bit':          return new Bit(x, y, ori);
            case 'ramp':
            case 'Ramp':         return new Ramp(x, y, ori);
            case 'crossover':
            case 'Crossover':    return new Crossover(x, y);
            case 'interceptor':
            case 'Interceptor':  return new Interceptor(x, y);
            case 'gear':
            case 'NormalGear':   return new NormalGear(x, y);
            case 'gearbit':
            case 'GearBit':      return new GearBit(x, y, rot);
            default:
                console.warn('Unknown piece type:', type);
                return null;
        }
    }

    function showError(msg: string | null) {
        placementError = msg;
        if (errorTimeout) clearTimeout(errorTimeout);
        if (msg) errorTimeout = setTimeout(() => { placementError = null; }, 2000);
    }

    // ─── Initial board setup ──────────────────────────────────────────────────

    // function setupGearTest() {
    //     engine.addPiece(new GearBit(3, 0, GearRotation.Counterclockwise));
    //     engine.addPiece(new NormalGear(3, 1));
    //     engine.addPiece(new GearBit(2, 1, GearRotation.Counterclockwise));
    //     engine.addPiece(new Ramp(4, 1, Orientation.Left));
    //     engine.addPiece(new Crossover(3, 2));
    //     engine.addPiece(new Ramp(2, 3, Orientation.Left));
    //     engine.addPiece(new Ramp(1, 4, Orientation.Right));
    //     engine.addPiece(new Ramp(2, 5, Orientation.Left));
    //     engine.addPiece(new Crossover(1, 6));
    //     engine.addPiece(new Ramp(0, 7, Orientation.Right));
    //     engine.addPiece(new Ramp(1, 8, Orientation.Right));
    //     engine.addPiece(new Ramp(2, 9, Orientation.Left));
    //     engine.addPiece(new Bit(4, 3, Orientation.Right));
    //     engine.addPiece(new Ramp(5, 4, Orientation.Right));
    //     engine.addPiece(new Ramp(6, 5, Orientation.Right));
    //     engine.addPiece(new Ramp(7, 6, Orientation.Left));
    //     engine.addPiece(new Ramp(6, 7, Orientation.Right));
    //     engine.addPiece(new Ramp(7, 8, Orientation.Left));
    //     engine.addPiece(new Ramp(6, 9, Orientation.Right));
    //     engine.addPiece(new Ramp(3, 4, Orientation.Left));
    //     engine.addPiece(new Ramp(7, 0, Orientation.Left));
    //     engine.addPiece(new Ramp(6, 1, Orientation.Left));
    //     engine.addPiece(new Ramp(5, 2, Orientation.Left));
    // }
    function setupNewBoard() {
    // Row 0
    engine.addPiece(new Ramp(3, 0, Orientation.Right));
    engine.addPiece(new Ramp(7, 0, Orientation.Left));

    // Row 1
    engine.addPiece(new Bit(4, 1, Orientation.Right));
    engine.addPiece(new Bit(6, 1, Orientation.Right));

    // Row 2
    engine.addPiece(new Ramp(3, 2, Orientation.Left));
    engine.addPiece(new Crossover(5, 2));
    engine.addPiece(new Ramp(7, 2, Orientation.Right));

    // Row 3
    engine.addPiece(new Bit(6, 3, Orientation.Right));
    engine.addPiece(new Ramp(8, 3, Orientation.Right));

    // Row 4
    engine.addPiece(new Ramp(1, 4, Orientation.Left));
    engine.addPiece(new Ramp(7, 4, Orientation.Left));
    engine.addPiece(new Interceptor(9, 4));

    // Row 5
    engine.addPiece(new Ramp(0, 5, Orientation.Right));
    
    engine.addPiece(new Ramp(6, 5, Orientation.Left));

    // Row 6
    engine.addPiece(new Ramp(1, 6, Orientation.Left));
    
    
    engine.addPiece(new GearBit(5, 6, GearRotation.Counterclockwise));

    // Row 7
    engine.addPiece(new Ramp(0, 7, Orientation.Right));
    engine.addPiece(new Crossover(6, 7));

    // Row 8
    engine.addPiece(new Ramp(1, 8, Orientation.Left));
    engine.addPiece(new Ramp(7, 8, Orientation.Left));

    // Row 9
    engine.addPiece(new Ramp(0, 9, Orientation.Right));
    engine.addPiece(new Crossover(6, 9));

    // Row 10
    engine.addPiece(new Ramp(5, 10, Orientation.Right));
}
    setupNewBoard();
</script>

{#if showTestPage}
    <AnimationTestPage />
{:else}

    <main>
        <div class="app-layout">
            <PieceToolbar onClearBoard={clearBoard} />

            <div class="center-column">
                <div class="controls-section">
                    <GameControls
                        onStep={step}
                        onPlay={handlePlay}
                        onPause={handlePause}
                        onStop={handleStop}
                        engineState={isAnimating ? (animIsPaused ? 'FROZEN' : 'RUNNING') : gameState.engineState}
                    />
                    <StatusDisplay
                        tick={isAnimating ? animTick : gameState.tick}
                        engineState={isAnimating ? (animIsPaused ? 'FROZEN' : 'RUNNING') : gameState.engineState}
                        leftQueueCount={isAnimating ? animLeftQueueCount : gameState.leftQueueCount}
                        rightQueueCount={isAnimating ? animRightQueueCount : gameState.rightQueueCount}
                    />
                </div>

                <div class="board-display">
                    <Board
                        board={gameState.board}
                        pieces={gameState.pieces}
                        activeBalls={gameState.activeBalls}
                        gridSize={GRID_SIZE}
                        globalScale={GLOBAL_SCALE}
                        onPieceDrop={handlePieceDrop}
                        onPieceToggle={handlePieceToggle}
                        onPieceRemove={handlePieceRemove}
                        {animBall}
                        {animPieceStates}
                        disableInteraction={isAnimating || gameState.engineState !== 'SETUP'}
                    />
                </div>

                <div class="debug-section">
                    <button onclick={() => showDebug = !showDebug} class="debug-toggle">
                        {showDebug ? 'Hide' : 'Show'} Debug Info
                    </button>
                    {#if showDebug}
                        <div class="state-display"><pre>{gameState.stateString}</pre></div>
                    {/if}
                </div>
            </div>
        </div>
    </main>

    {#if placementError}
        <div class="error-toast" role="alert">{placementError}</div>
    {/if}

{/if}

<button
    class="page-toggle"
    onclick={() => showTestPage = !showTestPage}
>
    {showTestPage ? '← Game' : '🔧 Anim Test'}
</button>

<style>
    main { max-width: 1400px; margin: 0 auto; padding: 2rem; }

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

    .board-display { display: flex; justify-content: center; }

    .error-toast {
        position: fixed;
        bottom: 2rem;
        left: 50%;
        transform: translateX(-50%);
        z-index: 9999;
        background: rgba(220, 60, 60, 0.92);
        color: #fff;
        padding: 0.6rem 1.4rem;
        border-radius: 8px;
        font-size: 0.875rem;
        font-weight: 500;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
        animation: toastIn 0.25s ease, toastOut 0.4s ease 1.6s forwards;
        pointer-events: none;
    }
 
    @keyframes toastIn {
        from { opacity: 0; transform: translateX(-50%) translateY(12px); }
        to   { opacity: 1; transform: translateX(-50%) translateY(0); }
    }
 
    @keyframes toastOut {
        from { opacity: 1; }
        to   { opacity: 0; transform: translateX(-50%) translateY(8px); }
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

    .page-toggle {
    position: fixed;
    top: 12px;
    right: 12px;
    z-index: 9999;
    padding: 6px 14px;
    border: 1px solid rgba(255,255,255,0.2);
    border-radius: 4px;
    background: rgba(30,30,30,0.9);
    color: #fff;
    font-size: 0.8rem;
    cursor: pointer;
    }
    .page-toggle:hover { background: rgba(60,60,60,0.9); }
    
</style>