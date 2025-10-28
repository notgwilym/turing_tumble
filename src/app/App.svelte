<script lang="ts">
    import { Engine } from '../engine/Engine';

    import { Orientation } from '../engine/pieces/Piece';
    import { Ramp } from '../engine/pieces/Ramp';
    import { Crossover } from '../engine/pieces/Crossover';

    let default_engine = new Engine();
    default_engine.addPiece(new Ramp(3 , 0, Orientation.Right));
    default_engine.addPiece(new Ramp(4 , 1, Orientation.Left));
    default_engine.addPiece(new Crossover(3 , 2));
    default_engine.addPiece(new Ramp(2 , 3, Orientation.Left));
    default_engine.addPiece(new Ramp(1 , 4, Orientation.Right));
    default_engine.addPiece(new Ramp(2 , 5, Orientation.Left));
    default_engine.addPiece(new Crossover(1 , 6));
    default_engine.addPiece(new Ramp(0 , 7, Orientation.Right));
    default_engine.addPiece(new Ramp(1 , 8, Orientation.Right));
    default_engine.addPiece(new Ramp(2 , 9, Orientation.Left));

    // reactive counter to trigger re-render
    let updateCounter = $state(0);

    let stateString = $derived.by(() => {
        updateCounter;
        return default_engine.getStateString();
    });
    

    function step() {
        default_engine.step();
        updateCounter++;
    }

</script>

<main>
    <h1>Turing Tumble Sim</h1>
    <button onclick={step}>Step</button>

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