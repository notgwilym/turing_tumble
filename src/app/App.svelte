<script lang="ts">
    import { Engine } from '../engine/Engine';
    let default_engine = new Engine();

    function print() {
        default_engine.printBoardState();
    }

</script>

<main>
    <h1>Hello, Svelte + TypeScript + Engine</h1>
    <button on:click={print}>Print State</button>
</main>