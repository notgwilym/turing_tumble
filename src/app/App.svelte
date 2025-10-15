<script lang="ts">
    import type { Engine } from '../engine';
    export let engine: Engine;

    function print() {
        engine.printState();
    }

</script>

<main>
    <h1>Hello, Svelte + TypeScript + Engine</h1>
    <button on:click={print}>Print State</button>
</main>