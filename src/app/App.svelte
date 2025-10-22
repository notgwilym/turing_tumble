<script lang="ts">
    import { Engine } from '../engine/Engine';

    import { Orientation } from '../engine/pieces/Piece';
    import { Ramp } from '../engine/pieces/Ramp';
    import { Crossover } from '../engine/pieces/Crossover';

    let default_engine = new Engine();
    default_engine.addPiece(new Ramp(3 , 0, Orientation.Right));
    default_engine.addPiece(new Ramp(4 , 1, Orientation.Left));
    default_engine.addPiece(new Crossover(3 , 2));

    function print_state() {
       console.log(default_engine.getState());
       console.log(default_engine.getBoard());
    }

</script>

<main>
    <h1>Hello, Svelte + TypeScript + Engine</h1>
    <button on:click={print_state}>Print Engine State</button>
</main>