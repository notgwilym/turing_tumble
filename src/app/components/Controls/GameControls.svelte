<script lang="ts">
    let { 
        onStep,
        onPlay,
        onPause,
        onStop,
        engineState 
    }: {
        onStep: () => void;
        onPlay?: () => void;
        onPause?: () => void;
        onStop?: () => void;
        engineState: string;
    } = $props();
    
    const canStep = $derived(
        engineState === 'SETUP' || 
        engineState === 'FROZEN'
    );
    
    const canPlay = $derived(
        engineState === 'SETUP' || 
        engineState === 'FROZEN'
    );
    
    const canPause = $derived(engineState === 'RUNNING');
    
    const canStop = $derived(
        engineState === 'RUNNING' || 
        engineState === 'FROZEN' || 
        engineState === 'FINISHED'
    );
</script>

<div class="game-controls">
    <div class="control-group">
        {#if onPlay}
            <button 
                onclick={onPlay} 
                disabled={!canPlay}
                class="btn-play"
                title="Play"
            >
                ▶
            </button>
        {/if}
        
        {#if onPause}
            <button 
                onclick={onPause} 
                disabled={!canPause}
                class="btn-pause"
                title="Pause"
            >
                ⏸
            </button>
        {/if}
        
        <button 
            onclick={onStep} 
            disabled={!canStep}
            class="btn-step"
            title="Step forward"
        >
            ⏭
        </button>
        
        {#if onStop}
            <button 
                onclick={onStop} 
                disabled={!canStop}
                class="btn-stop"
                title="Stop and reset"
            >
                ⏹
            </button>
        {/if}
    </div>
</div>

<style>
    .game-controls {
        display: flex;
        gap: 0.75rem;
        align-items: center;
        padding: 0.6rem 0.9rem;
        background: var(--panel-bg);
        border: 2px solid var(--panel-border);
        border-radius: 5px 9px 6px 8px / 8px 5px 9px 6px;
        box-shadow: 3px 3px 0 var(--panel-shadow);
    }

    .control-group {
        display: flex;
        gap: 0.4rem;
    }

    button {
        min-width: 2.8rem;
        height: 2.8rem;
        font-size: 1.15rem;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 4px 7px 5px 6px / 6px 4px 7px 5px;
        border: 2px solid var(--panel-border);
        background: var(--cream);
        color: var(--ink);
        cursor: pointer;
        transition: transform 0.12s, box-shadow 0.12s;
        box-shadow: 2px 2px 0 var(--panel-shadow);
    }

    button:hover:not(:disabled) {
        transform: translateY(-2px);
        box-shadow: 3px 4px 0 var(--panel-shadow);
    }

    button:active:not(:disabled) {
        transform: translateY(1px);
        box-shadow: 1px 1px 0 var(--panel-shadow);
    }

    button:disabled {
        opacity: 0.35;
        cursor: not-allowed;
        box-shadow: none;
    }

    .btn-play:not(:disabled) {
        background: hsl(130, 55%, 88%);
        border-color: hsl(130, 45%, 55%);
        box-shadow: 2px 2px 0 hsl(130, 35%, 65%);
    }
    .btn-play:not(:disabled):hover {
        box-shadow: 3px 4px 0 hsl(130, 35%, 65%);
    }

    .btn-pause:not(:disabled) {
        background: hsl(38, 90%, 87%);
        border-color: hsl(38, 70%, 55%);
        box-shadow: 2px 2px 0 hsl(38, 55%, 65%);
    }
    .btn-pause:not(:disabled):hover {
        box-shadow: 3px 4px 0 hsl(38, 55%, 65%);
    }

    .btn-stop:not(:disabled) {
        background: hsl(8, 75%, 88%);
        border-color: hsl(8, 60%, 55%);
        box-shadow: 2px 2px 0 hsl(8, 45%, 65%);
    }
    .btn-stop:not(:disabled):hover {
        box-shadow: 3px 4px 0 hsl(8, 45%, 65%);
    }

    .btn-step:not(:disabled) {
        background: hsl(210, 60%, 88%);
        border-color: hsl(210, 50%, 55%);
        box-shadow: 2px 2px 0 hsl(210, 35%, 65%);
    }
    .btn-step:not(:disabled):hover {
        box-shadow: 3px 4px 0 hsl(210, 35%, 65%);
    }
</style>