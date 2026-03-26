<script lang="ts">
    let { 
        tick,
        engineState,
        leftQueueCount,
        rightQueueCount 
    }: {
        tick: number;
        engineState: string;
        leftQueueCount: number;
        rightQueueCount: number;
    } = $props();
    
    // Color-code the state
    const stateColor = $derived(getStateColor(engineState));
    
    function getStateColor(state: string): string {
        switch(state) {
            case 'INIT':     return 'hsl(25, 20%, 60%)';
            case 'SETUP':    return 'hsl(210, 55%, 40%)';
            case 'RUNNING':  return 'hsl(130, 50%, 32%)';
            case 'FROZEN':   return 'hsl(35, 75%, 38%)';
            case 'FINISHED': return 'hsl(8, 60%, 42%)';
            default:         return 'hsl(25, 20%, 60%)';
        }
    }
</script>

<div class="status-display">
    <div class="status-item state">
        <span class="label">State:</span>
        <span class="value" style="color: {stateColor}">
            {engineState}
        </span>
    </div>
    
    <div class="status-item">
        <span class="label">Tick:</span>
        <span class="value">{tick}</span>
    </div>
    
    <div class="status-item queue">
        <span class="label">Queues:</span>
        <div class="queue-counts">
            <span class="queue-count blue" title="Blue balls (right)">
                <img src="/src/assets/ball_blue.svg" alt="blue ball" class="ball-icon" />
                {rightQueueCount}
            </span>
            <span class="queue-count red" title="Red balls (left)">
                <img src="/src/assets/ball_red.svg" alt="red ball" class="ball-icon" />
                {leftQueueCount}
            </span>
        </div>
    </div>
</div>

<style>
    .status-display {
        display: flex;
        gap: 1.5rem;
        align-items: center;
        padding: 0.6rem 1rem;
        background: var(--panel-bg);
        border: 2px solid var(--panel-border);
        border-radius: 6px 9px 7px 8px / 8px 6px 9px 7px;
        box-shadow: 3px 3px 0 var(--panel-shadow);
        font-family: 'Oliver', 'Architects Daughter', cursive;
    }

    .status-item {
        display: flex;
        gap: 0.4rem;
        align-items: center;
    }

    /* Pipe separator between items */
    .status-item + .status-item {
        border-left: 2px solid var(--panel-border);
        padding-left: 1.5rem;
    }

    .label {
        color: var(--ink-mid);
        font-size: 0.85rem;
        text-transform: uppercase;
        letter-spacing: 0.04em;
    }

    .value {
        color: var(--ink);
        font-size: 1rem;
        font-weight: 700;
    }

    .state .value {
        padding: 0.15rem 0.6rem;
        background: var(--cream);
        border: 2px solid var(--panel-border);
        border-radius: 3px 6px 4px 5px / 5px 3px 6px 4px;
    }

    .queue-counts {
        display: flex;
        gap: 0.75rem;
    }

    .queue-count {
        display: flex;
        align-items: center;
        gap: 0.25rem;
        font-size: 0.95rem;
        font-weight: 700;
        color: var(--ink);
    }

    .ball-icon {
        width: 1.1rem;
        height: 1.1rem;
    }
</style>