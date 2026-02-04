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

    let engine = new Engine();

    // Reactive state - updated via syncFromEngine()
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

    // Grid size in pixels
    const GRID_SIZE = 60;

    // Show debug info
    let showDebug = $state(false);

    // Auto-sync from engine
    $effect(() => {
        // Initial sync
        syncFromEngine();
        
        // Subscribe to future changes
        const unsubscribe = engine.subscribe(() => {
            syncFromEngine();
        });
        
        // Cleanup on destroy
        return unsubscribe;
    });

    function syncFromEngine() {
        // Create completely new gameState object with new references
        // This ensures Svelte's reactivity system detects all changes
        gameState = {
            // Primitives - simple assignment
            tick: engine.getCurrentTick(),
            engineState: engine.getState(),
            leftQueueCount: engine.getQueueCounts().left,
            rightQueueCount: engine.getQueueCounts().right,
            stateString: engine.getStateString(),
            
            // Arrays - create new references with spread operator
            activeBalls: engine.getActiveBalls().map(ball => ball.clone()),
            finishedBalls: engine.getFinishedBalls().map(ball => ball.clone()),
            
            // 2D arrays - deep copy with map
            board: engine.getBoard().getGrid().map(row => row.map(cell => cell)),
            pieces: engine.getBoard().getPieceGrid().map(row => row.map(piece => piece ? piece.clone() : null)),
        };

        

        // console.log(
        //     engine.getBoard().getPieceGrid()[0][4],
        //     gameState.pieces[0][4],
        //     engine.getBoard().getPieceGrid()[0][4] === gameState.pieces[0][4]
        // );
    }

    // Control handlers
    function step() {
        engine.step();
        console.log(engine.getStateString());
    }

    // Setup default puzzle for testing
    function setupDefaultPuzzle() {
        engine.addPiece(new Bit(3, 0, Orientation.Right));
        engine.addPiece(new Ramp(4, 1, Orientation.Left));
        engine.addPiece(new Crossover(3, 2));
        engine.addPiece(new Ramp(2, 3, Orientation.Left));
        engine.addPiece(new Ramp(1, 4, Orientation.Right));
        engine.addPiece(new Ramp(2, 5, Orientation.Left));
        engine.addPiece(new Crossover(1, 6));
        engine.addPiece(new Ramp(0, 7, Orientation.Right));
        engine.addPiece(new Ramp(1, 8, Orientation.Right));
        engine.addPiece(new Ramp(2, 9, Orientation.Left));

        engine.addPiece(new Ramp(2, 1, Orientation.Right));
        engine.addPiece(new Crossover(4, 3));
        engine.addPiece(new Ramp(5, 4, Orientation.Right));
        engine.addPiece(new Ramp(6, 5, Orientation.Right));
        engine.addPiece(new Ramp(7, 6, Orientation.Left));
        engine.addPiece(new Ramp(6, 7, Orientation.Right));
        engine.addPiece(new Ramp(7, 8, Orientation.Left));
        engine.addPiece(new Ramp(6, 9, Orientation.Right));

        engine.addPiece(new Bit(7, 0, Orientation.Left));
        engine.addPiece(new Ramp(6, 1, Orientation.Left));
        engine.addPiece(new Ramp(5, 2, Orientation.Left));
        engine.addPiece(new Ramp(3, 4, Orientation.Left));

        engine.addPiece(new Interceptor(8, 1));
    }

    // Gear system test setup
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

    // Initialize with gear test
    setupGearTest();
</script>

<main>
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

    <div class="board-display">
        <Board 
            board={gameState.board}
            pieces={gameState.pieces}
            activeBalls={gameState.activeBalls}
            gridSize={GRID_SIZE}
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
</main>

<style>
    main {
        max-width: 1400px;
        margin: 0 auto;
        padding: 2rem;
        text-align: center;
    }

    h1 {
        font-size: 2.5rem;
        margin-bottom: 2rem;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
    }

    .controls-section {
        display: flex;
        gap: 2rem;
        justify-content: center;
        align-items: center;
        margin-bottom: 2rem;
        flex-wrap: wrap;
    }

    .board-display {
        display: flex;
        justify-content: center;
        align-items: center;
        min-height: 400px;
    }

    .debug-section {
        margin-top: 2rem;
    }

    .debug-toggle {
        margin-bottom: 1rem;
        padding: 0.5rem 1rem;
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 4px;
        color: #fff;
        cursor: pointer;
        transition: all 0.2s;
    }

    .debug-toggle:hover {
        background: rgba(255, 255, 255, 0.2);
    }

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
        font-family: 'Courier New', Courier, monospace;
        font-size: 0.8rem;
        line-height: 1.4;
        color: #e0e0e0;
    }
</style>