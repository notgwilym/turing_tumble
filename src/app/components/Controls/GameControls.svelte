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
        gap: 1rem;
        align-items: center;
        padding: 1rem;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 8px;
    }
    
    .control-group {
        display: flex;
        gap: 0.5rem;
    }
    
    button {
        min-width: 3rem;
        height: 3rem;
        font-size: 1.2rem;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 6px;
        border: 2px solid transparent;
        background: rgba(255, 255, 255, 0.1);
        color: #fff;
        cursor: pointer;
        transition: all 0.2s;
    }
    
    button:hover:not(:disabled) {
        background: rgba(0, 0, 0, 0.2);
        border-color: rgba(255, 255, 255, 0.3);
        transform: translateY(-2px);
    }
    
    button:active:not(:disabled) {
        transform: translateY(0);
    }
    
    button:disabled {
        opacity: 0.3;
        cursor: not-allowed;
    }
    
    .btn-play:not(:disabled) {
        background: rgba(0, 200, 100, 0.2);
        border-color: rgba(0, 200, 100, 0.3);
    }
    
    .btn-pause:not(:disabled) {
        background: rgba(255, 165, 0, 0.2);
        border-color: rgba(255, 165, 0, 0.3);
    }
    
    .btn-stop:not(:disabled) {
        background: rgba(255, 50, 50, 0.2);
        border-color: rgba(255, 50, 50, 0.3);
    }
    
    .btn-step:not(:disabled) {
        background: rgba(100, 150, 255, 0.2);
        border-color: rgba(100, 150, 255, 0.3);
    }
</style>