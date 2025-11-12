<script lang="ts">
    import { Engine } from '../engine/Engine';
    import { CellType } from '../engine/Board';
    import { Orientation } from '../engine/pieces/Piece';
    import { Bit } from '../engine/pieces/Bit';
    import { Ramp } from '../engine/pieces/Ramp';
    import { Crossover } from '../engine/pieces/Crossover';
    import { Interceptor } from '../engine/pieces/Interceptor';

    import type { Ball } from '../engine/Ball';
    import type { Piece } from '../engine/pieces/Piece';

    let engine = new Engine();

    // reactive state
    let gameState = $state({
        // engine state
        tick: 0,
        engineState: 'INIT',
        board: [] as CellType[][],
        pieces: [] as (Piece | null)[][],
        leftQueueCount: 0,
        rightQueueCount: 0,
        activeBalls: [] as Ball[],
        finishedBalls: [] as Ball[],
        
        // ui-only state
    });

    // auto-sync
    $effect(() => {
        // initial sync
        syncFromEngine();
        
        // subscribe to future changes
        const unsubscribe = engine.subscribe(() => {
            syncFromEngine();
        });
        
        // cleanup on destroy
        return unsubscribe;
    });

    function syncFromEngine() {
        console.log("Syncing game state from engine.");
        gameState.tick = engine.getCurrentTick();
        gameState.engineState = engine.getState();
        gameState.board = engine.getBoard().getGrid();
        gameState.pieces = engine.getBoard().getPieceGrid();
        
        const queues = engine.getQueueCounts();
        gameState.leftQueueCount = queues.left;
        gameState.rightQueueCount = queues.right;
        
        gameState.activeBalls = engine.getActiveBalls();
        gameState.finishedBalls = engine.getFinishedBalls();
    }

    function step() {
        engine.step();
    }

    let stateString = $derived(engine.getStateString());

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

    setupDefaultPuzzle();
</script>

<main>
    <h1>Turing Tumble Sim</h1>

    <div class="controls">
        <button onclick={step}>Step</button>
        <div class="status">
            <span>State: {gameState.engineState}</span>
            <span>Tick: {gameState.tick}</span>
            <span>Left Queue: {gameState.leftQueueCount}</span>
            <span>Right Queue: {gameState.rightQueueCount}</span>
        </div>
    </div>

    <div class="state-display">
        <pre>{stateString}</pre>
    </div>

    
</main>

<style>
    .state-display {
        margin-top: 2rem;
        padding: 1rem;
        background-color: #1a1a1a;
        border: 1px solid #333;
        border-radius: 4px;
        overflow-x: auto;
    }

    pre {
        margin: 0;
        font-family: 'Courier New', Courier, monospace;
        font-size: 0.9rem;
        line-height: 1.4;
        color: #e0e0e0;
    }

    button {
        margin-right: 0.5rem;
    }
</style>