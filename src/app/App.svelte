<script lang="ts">
    import type { Engine } from '../engine';
    export let engine: Engine;
    export let count: number = 0;

    function increment() {
        count = engine.increment();
    }

</script>

<main>
    <h1>Hello, Svelte + TypeScript + Engine</h1>
    <p>Counter: {count}</p>
    <button on:click={increment}>Increment</button>
</main>