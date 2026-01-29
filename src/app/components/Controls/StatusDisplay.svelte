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
            case 'INIT': return '#888';
            case 'SETUP': return '#4a90e2';
            case 'RUNNING': return '#00c864';
            case 'FROZEN': return '#ff9500';
            case 'FINISHED': return '#ff3232';
            default: return '#888';
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
            <span class="queue-count red" title="Red balls (left)">
                🔴 {leftQueueCount}
            </span>
            <span class="queue-count blue" title="Blue balls (right)">
                🔵 {rightQueueCount}
            </span>
        </div>
    </div>
</div>

<style>
    .status-display {
        display: flex;
        gap: 2rem;
        align-items: center;
        padding: 1rem;
        background: rgba(0, 0, 0, 0.3);
        border-radius: 8px;
        font-family: 'Courier New', monospace;
    }
    
    .status-item {
        display: flex;
        gap: 0.5rem;
        align-items: center;
    }
    
    .label {
        color: #888;
        font-size: 0.9rem;
        font-weight: 600;
        text-transform: uppercase;
    }
    
    .value {
        color: #fff;
        font-size: 1.1rem;
        font-weight: 700;
    }
    
    .state .value {
        padding: 0.25rem 0.75rem;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 4px;
    }
    
    .queue-counts {
        display: flex;
        gap: 1rem;
    }
    
    .queue-count {
        display: flex;
        align-items: center;
        gap: 0.25rem;
        font-size: 1rem;
        font-weight: 700;
    }
    
    .queue-count.red {
        color: #ff5555;
    }
    
    .queue-count.blue {
        color: #5599ff;
    }
</style>