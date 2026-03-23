<script lang="ts">
    import type { Ball } from '@engine/Ball';

    let {
        ball,
        gridSize,
        worldX,
        worldY,
    }: {
        ball: Ball;
        gridSize: number;
        /** If provided, overrides grid-based position with world-space pixels */
        worldX?: number;
        worldY?: number;
    } = $props();

    // Use world-space position if provided, otherwise derive from grid cell
    const position = $derived({
        x: worldX ?? (ball.x * gridSize + gridSize / 2),
        y: worldY ?? (ball.y * gridSize + gridSize / 2),
    });

    // Determine ball size and SVG
    const ballSize = $derived(gridSize * 0.25);
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
        /* No CSS transition — AnimationController drives position directly */
        pointer-events: none;
    }
    
    .ball img {
        width: 100%;
        height: 100%;
        object-fit: contain;
        user-select: none;
        -webkit-user-drag: none;
    }
    
    @keyframes bounce-in {
        0% { transform: translate(-50%, -50%) scale(0); }
        50% { transform: translate(-50%, -50%) scale(1.2); }
        100% { transform: translate(-50%, -50%) scale(1); }
    }
    
    .ball {
        animation: bounce-in 0.3s ease-out;
    }
</style>