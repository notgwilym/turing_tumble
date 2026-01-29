<script lang="ts">
    import type { Ball } from '@engine/Ball';
    
    let { 
        ball,
        gridSize 
    }: {
        ball: Ball;
        gridSize: number;
    } = $props();
    
    // Calculate visual position (centered in cell)
    const position = $derived({ 
        x: ball.x * gridSize + gridSize / 2, 
        y: ball.y * gridSize + gridSize / 2
    });
    
    // Determine ball size and SVG
    const ballSize = $derived(gridSize * 0.7);
    const svgPath = $derived(ball.colour === 'red' 
        ? '/src/assets/ball_red.svg' 
        : '/src/assets/ball_blue.svg'
    );
</script>

<div 
    class="ball {ball.colour}"
    style="
        left: {position.x}px; 
        top: {position.y}px;
        width: {ballSize}px;
        height: {ballSize}px;
    "
>
    <img 
        src={svgPath} 
        alt="{ball.colour} ball"
        draggable="false"
    />
</div>

<style>
    .ball {
        position: absolute;
        display: flex;
        align-items: center;
        justify-content: center;
        /* Center the ball on its position */
        transform: translate(-50%, -50%);
        /* Smooth animation when position changes */
        transition: left 0.3s ease-out, top 0.3s ease-out;
        pointer-events: none;
    }
    
    .ball img {
        width: 100%;
        height: 100%;
        object-fit: contain;
        user-select: none;
        -webkit-user-drag: none;
    }
    
    /* Ball-specific effects */
    .ball.red img {
        filter: drop-shadow(0 2px 6px rgba(255, 0, 1, 0.5));
    }
    
    .ball.blue img {
        filter: drop-shadow(0 2px 6px rgba(0, 95, 255, 0.5));
    }
    
    /* Optional: Add a bounce animation when ball appears */
    @keyframes bounce-in {
        0% { transform: translate(-50%, -50%) scale(0); }
        50% { transform: translate(-50%, -50%) scale(1.2); }
        100% { transform: translate(-50%, -50%) scale(1); }
    }
    
    .ball {
        animation: bounce-in 0.3s ease-out;
    }
</style>