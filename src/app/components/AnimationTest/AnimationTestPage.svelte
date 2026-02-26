<script lang="ts">
    import { PIECE_CONFIGS, getDisplayHeight, type PieceAnimConfig, type PiecePoint } from './PieceAnimConfig';

    const GRID = 80; // larger than game grid for easier visual work

    // ─── Piece Inspector State ───────────────────────────────────────────────
    let selectedIdx = $state(0);

    // Deep-clone configs so edits are local and reactive
    let configs = $state<PieceAnimConfig[]>(
        JSON.parse(JSON.stringify(PIECE_CONFIGS))
    );

    let flipped = $state(false);

    const cfg = $derived(configs[selectedIdx]);

    // Entry points are cell-fixed: never affected by piece flip
    // Exit points move with the piece: swap names + negate x when flipped

    // ─── Chain Test State ────────────────────────────────────────────────────
    let chainSlots = $state<{ configIdx: number; flipped: boolean }[]>([
        { configIdx: 0, flipped: false },
        { configIdx: 2, flipped: false },
        { configIdx: 1, flipped: false },
    ]);

    type ChainDir = 'left' | 'right';
    let chainDirs = $state<ChainDir[]>(['right', 'left']);

    // Chain grid positions (cell coords)
    const chainPositions = $derived.by(() => {
        const positions: { col: number; row: number }[] = [{ col: 3, row: 0 }];
        for (let i = 0; i < chainDirs.length; i++) {
            const prev = positions[i];
            const dc = chainDirs[i] === 'right' ? 1 : -1;
            positions.push({ col: prev.col + dc, row: prev.row + 1 });
        }
        return positions;
    });

    // Compute world-space connection points for chain
    interface ConnectionLine {
        fromX: number; fromY: number;
        toX: number; toY: number;
        gap: number; // pixel distance between exit and entry (0 = perfect)
    }

    const chainConnections = $derived.by(() => {
        const lines: ConnectionLine[] = [];
        for (let i = 0; i < chainDirs.length; i++) {
            const cfgA = configs[chainSlots[i].configIdx];
            const cfgB = configs[chainSlots[i + 1].configIdx];
            const flipA = chainSlots[i].flipped;
            const posA = chainPositions[i];
            const posB = chainPositions[i + 1];
            const dir = chainDirs[i];

            // A's exit point (world px)
            // When flipped, the piece sends the ball the OTHER way visually,
            // so swap which exit name we use and negate x to get world position.
            let exitPt: PiecePoint;
            if (!flipA) {
                exitPt = dir === 'right' ? cfgA.exitToRight : cfgA.exitToLeft;
            } else {
                // Flipped: exitToRight is now visually on the left, so use
                // exitToLeft (now visually on right) when chain says 'right'
                const raw = dir === 'right' ? cfgA.exitToLeft : cfgA.exitToRight;
                exitPt = { x: -raw.x, y: raw.y };
            }
            const ax = posA.col * GRID + GRID / 2 + exitPt.x;
            const ay = posA.row * GRID + GRID / 2 + exitPt.y;

            // B's entry point (world px)
            // Entry is determined by board geometry (where the ball comes from),
            // NOT by B's flip state. The ball always arrives at the same cell-
            // relative position regardless of how B is oriented.
            const entryPt = dir === 'right' ? cfgB.entryFromLeft : cfgB.entryFromRight;
            const bx = posB.col * GRID + GRID / 2 + entryPt.x;
            const by = posB.row * GRID + GRID / 2 + entryPt.y;

            const gap = Math.sqrt((ax - bx) ** 2 + (ay - by) ** 2);
            lines.push({ fromX: ax, fromY: ay, toX: bx, toY: by, gap });
        }
        return lines;
    });

    // ─── Export ──────────────────────────────────────────────────────────────
    function exportConfigs() {
        const out = configs.map(c => ({
            type: c.type,
            displayWidth: c.displayWidth,
            viewBoxWidth: c.viewBoxWidth,
            viewBoxHeight: c.viewBoxHeight,
            centre: c.centre,
            entryFromLeft: c.entryFromLeft,
            entryFromRight: c.entryFromRight,
            exitToLeft: c.exitToLeft,
            exitToRight: c.exitToRight,
        }));
        const json = JSON.stringify(out, null, 2);
        navigator.clipboard?.writeText(json);
        console.log('Piece configs:', json);
        exportFlash = true;
        setTimeout(() => exportFlash = false, 1500);
    }
    let exportFlash = $state(false);
</script>

<div class="test-page">
    <!-- ─── Header ──────────────────────────────────────────────────────── -->
    <header>
        <h1>Animation Test Page</h1>
        <p class="subtitle">Position piece centres, entry/exit points, and verify chain alignment</p>
    </header>

    <div class="panels">
        <!-- ─── LEFT: Piece Inspector ────────────────────────────────────── -->
        <section class="panel inspector">
            <h2>Piece Inspector</h2>

            <!-- Piece selector -->
            <div class="piece-tabs">
                {#each configs as c, i}
                    <button
                        class="tab"
                        class:active={i === selectedIdx}
                        onclick={() => { selectedIdx = i; flipped = false; }}
                    >{c.label}</button>
                {/each}
            </div>

            {#if cfg.flippable}
                <label class="flip-toggle">
                    <input type="checkbox" bind:checked={flipped} />
                    Show flipped
                </label>
            {/if}

            <!-- Visual preview -->
            <div class="preview-container">
                <div
                    class="preview-grid"
                    style="width: {GRID}px; height: {GRID}px;"
                >
                    <!-- Grid cell outline -->
                    <div class="cell-outline"></div>

                    <!-- Peg dot at cell centre -->
                    <div class="peg-dot" style="left: {GRID/2}px; top: {GRID/2}px;"></div>

                    <!-- Piece SVG -->
                    <img
                        class="piece-svg"
                        src={cfg.svgPath}
                        alt={cfg.label}
                        style="
                            width: {cfg.displayWidth}px;
                            height: {getDisplayHeight(cfg)}px;
                            left: {GRID / 2 - cfg.centre.x}px;
                            top: {GRID / 2 - cfg.centre.y}px;
                            transform-origin: {cfg.centre.x}px {cfg.centre.y}px;
                            transform: scaleX({flipped ? -1 : 1});
                        "
                        draggable="false"
                    />

                    <!-- Centre crosshair -->
                    <div class="marker centre" style="left: {GRID/2}px; top: {GRID/2}px;" title="Centre (peg)">
                        <div class="crosshair-h"></div>
                        <div class="crosshair-v"></div>
                    </div>

                    <!-- Entry points (cell-fixed, never flip) -->
                    <div
                        class="marker entry-left"
                        style="left: {GRID/2 + cfg.entryFromLeft.x}px; top: {GRID/2 + cfg.entryFromLeft.y}px;"
                        title="Entry from left"
                    ></div>
                    <div
                        class="marker entry-right"
                        style="left: {GRID/2 + cfg.entryFromRight.x}px; top: {GRID/2 + cfg.entryFromRight.y}px;"
                        title="Entry from right"
                    ></div>

                    <!-- Exit points (move with piece: swap + negate x on flip) -->
                    <div
                        class="marker exit-left"
                        style="left: {GRID/2 + (flipped ? -cfg.exitToRight.x : cfg.exitToLeft.x)}px; top: {GRID/2 + (flipped ? cfg.exitToRight.y : cfg.exitToLeft.y)}px;"
                        title="Exit to left"
                    ></div>
                    <div
                        class="marker exit-right"
                        style="left: {GRID/2 + (flipped ? -cfg.exitToLeft.x : cfg.exitToRight.x)}px; top: {GRID/2 + (flipped ? cfg.exitToLeft.y : cfg.exitToRight.y)}px;"
                        title="Exit to right"
                    ></div>
                </div>

                <!-- Legend -->
                <div class="legend">
                    <span><i class="dot" style="background:#fff;"></i> Centre</span>
                    <span><i class="dot" style="background:#4ade80;"></i> Entry L</span>
                    <span><i class="dot" style="background:#60a5fa;"></i> Entry R</span>
                    <span><i class="dot" style="background:#fb923c;"></i> Exit L</span>
                    <span><i class="dot" style="background:#f87171;"></i> Exit R</span>
                </div>
            </div>

            <!-- Editable values -->
            <div class="controls-grid">
                <fieldset>
                    <legend>Display Size</legend>
                    <label>W <input type="number" bind:value={cfg.displayWidth} step={1} /></label>
                    <label class="computed">H {getDisplayHeight(cfg).toFixed(0)}</label>
                </fieldset>

                <fieldset>
                    <legend>ViewBox (from SVG)</legend>
                    <label>W <input type="number" bind:value={cfg.viewBoxWidth} step={1} /></label>
                    <label>H <input type="number" bind:value={cfg.viewBoxHeight} step={1} /></label>
                </fieldset>

                <fieldset>
                    <legend>Centre (from SVG top-left)</legend>
                    <label>X <input type="number" bind:value={cfg.centre.x} step={1} /></label>
                    <label>Y <input type="number" bind:value={cfg.centre.y} step={1} /></label>
                </fieldset>

                <fieldset>
                    <legend>Entry from Left</legend>
                    <label>X <input type="number" bind:value={cfg.entryFromLeft.x} step={1} /></label>
                    <label>Y <input type="number" bind:value={cfg.entryFromLeft.y} step={1} /></label>
                </fieldset>

                <fieldset>
                    <legend>Entry from Right</legend>
                    <label>X <input type="number" bind:value={cfg.entryFromRight.x} step={1} /></label>
                    <label>Y <input type="number" bind:value={cfg.entryFromRight.y} step={1} /></label>
                </fieldset>

                <fieldset>
                    <legend>Exit to Left</legend>
                    <label>X <input type="number" bind:value={cfg.exitToLeft.x} step={1} /></label>
                    <label>Y <input type="number" bind:value={cfg.exitToLeft.y} step={1} /></label>
                </fieldset>

                <fieldset>
                    <legend>Exit to Right</legend>
                    <label>X <input type="number" bind:value={cfg.exitToRight.x} step={1} /></label>
                    <label>Y <input type="number" bind:value={cfg.exitToRight.y} step={1} /></label>
                </fieldset>
            </div>
        </section>

        <!-- ─── RIGHT: Chain Test ────────────────────────────────────────── -->
        <section class="panel chain">
            <h2>Chain Test</h2>

            <!-- Chain config row -->
            <div class="chain-config">
                {#each chainSlots as slot, i}
                    <div class="chain-slot-config">
                        <span class="slot-label">Slot {i + 1}</span>
                        <select bind:value={slot.configIdx}>
                            {#each configs as c, ci}
                                <option value={ci}>{c.label}</option>
                            {/each}
                        </select>
                        {#if configs[slot.configIdx].flippable}
                            <label class="mini-flip">
                                <input type="checkbox" bind:checked={slot.flipped} /> flip
                            </label>
                        {/if}
                    </div>
                    {#if i < chainDirs.length}
                        <div class="dir-picker">
                            <button
                                class="dir-btn"
                                class:active={chainDirs[i] === 'left'}
                                onclick={() => chainDirs[i] = 'left'}
                            >↙</button>
                            <button
                                class="dir-btn"
                                class:active={chainDirs[i] === 'right'}
                                onclick={() => chainDirs[i] = 'right'}
                            >↘</button>
                        </div>
                    {/if}
                {/each}
            </div>

            <!-- Chain visual -->
            <div class="chain-viewport">
                <svg
                    class="chain-svg"
                    width={8 * GRID}
                    height={(chainPositions.length + 1) * GRID}
                    viewBox="0 0 {8 * GRID} {(chainPositions.length + 1) * GRID}"
                >
                    <!-- Grid background -->
                    {#each Array(chainPositions.length + 1) as _, row}
                        {#each Array(8) as _, col}
                            {@const isSlotPeg = (col % 2 === 0) !== (row % 2 === 0)}
                            <rect
                                x={col * GRID}
                                y={row * GRID}
                                width={GRID}
                                height={GRID}
                                fill={isSlotPeg ? 'rgba(80,120,180,0.08)' : 'transparent'}
                                stroke="rgba(150,150,150,0.15)"
                                stroke-width="1"
                            />
                            <!-- Peg dots -->
                            {#if !isSlotPeg}
                                <circle
                                    cx={col * GRID + GRID / 2}
                                    cy={row * GRID + GRID / 2}
                                    r="3"
                                    fill="rgba(150,150,150,0.3)"
                                />
                            {:else}
                                <circle
                                    cx={col * GRID + GRID / 2}
                                    cy={row * GRID + GRID / 2}
                                    r="5"
                                    fill="none"
                                    stroke="rgba(74,144,226,0.3)"
                                    stroke-width="1.5"
                                />
                            {/if}
                        {/each}
                    {/each}

                    <!-- Connection lines -->
                    {#each chainConnections as conn, i}
                        <line
                            x1={conn.fromX}
                            y1={conn.fromY}
                            x2={conn.toX}
                            y2={conn.toY}
                            stroke={conn.gap < 3 ? '#4ade80' : '#f87171'}
                            stroke-width={conn.gap < 3 ? 2 : 2.5}
                            stroke-dasharray={conn.gap < 3 ? 'none' : '6 4'}
                        />
                        <!-- Gap label if misaligned -->
                        {#if conn.gap >= 3}
                            <text
                                x={(conn.fromX + conn.toX) / 2 + 8}
                                y={(conn.fromY + conn.toY) / 2}
                                fill="#f87171"
                                font-size="11"
                                font-family="monospace"
                            >{conn.gap.toFixed(1)}px</text>
                        {/if}
                    {/each}

                    <!-- Pieces in chain -->
                    {#each chainSlots as slot, i}
                        {@const pcfg = configs[slot.configIdx]}
                        {@const pos = chainPositions[i]}
                        {@const cx = pos.col * GRID + GRID / 2}
                        {@const cy = pos.row * GRID + GRID / 2}
                        {@const fl = slot.flipped}

                        <!-- Piece SVG via native SVG image (no foreignObject quirks) -->
                        {#if fl}
                            <g transform="translate({cx}, {cy}) scale(-1, 1) translate({-cx}, {-cy})">
                                <image
                                    href={pcfg.svgPath}
                                    x={cx - pcfg.centre.x}
                                    y={cy - pcfg.centre.y}
                                    width={pcfg.displayWidth}
                                    height={getDisplayHeight(pcfg)}
                                />
                            </g>
                        {:else}
                            <image
                                href={pcfg.svgPath}
                                x={cx - pcfg.centre.x}
                                y={cy - pcfg.centre.y}
                                width={pcfg.displayWidth}
                                height={getDisplayHeight(pcfg)}
                            />
                        {/if}

                        <!-- Centre marker -->
                        <circle cx={cx} cy={cy} r="4" fill="white" stroke="#333" stroke-width="1.5" />

                        <!-- Entry markers (cell-fixed, never flip) -->
                        <circle cx={cx + pcfg.entryFromLeft.x} cy={cy + pcfg.entryFromLeft.y} r="4" fill="#4ade80" opacity="0.8" />
                        <circle cx={cx + pcfg.entryFromRight.x} cy={cy + pcfg.entryFromRight.y} r="4" fill="#60a5fa" opacity="0.8" />

                        <!-- Exit markers (move with piece: swap names + negate x when flipped) -->
                        {@const xlPt = fl ? { x: -pcfg.exitToRight.x, y: pcfg.exitToRight.y } : pcfg.exitToLeft}
                        {@const xrPt = fl ? { x: -pcfg.exitToLeft.x, y: pcfg.exitToLeft.y } : pcfg.exitToRight}
                        <circle cx={cx + xlPt.x} cy={cy + xlPt.y} r="4" fill="#fb923c" opacity="0.8" />
                        <circle cx={cx + xrPt.x} cy={cy + xrPt.y} r="4" fill="#f87171" opacity="0.8" />

                        <!-- Slot label -->
                        <text
                            x={cx}
                            y={cy - pcfg.centre.y - 6}
                            text-anchor="middle"
                            fill="rgba(255,255,255,0.5)"
                            font-size="11"
                            font-family="monospace"
                        >{pcfg.label}{fl ? ' (flip)' : ''}</text>
                    {/each}
                </svg>
            </div>

            <!-- Connection report -->
            <div class="conn-report">
                {#each chainConnections as conn, i}
                    <div class="conn-row" class:aligned={conn.gap < 3}>
                        <span>Link {i + 1}→{i + 2}:</span>
                        {#if conn.gap < 3}
                            <span class="status good">✓ aligned ({conn.gap.toFixed(1)}px)</span>
                        {:else}
                            <span class="status bad">✗ gap {conn.gap.toFixed(1)}px</span>
                        {/if}
                    </div>
                {/each}
            </div>
        </section>
    </div>

    <!-- ─── Export bar ────────────────────────────────────────────────────── -->
    <div class="export-bar">
        <button class="export-btn" class:flash={exportFlash} onclick={exportConfigs}>
            Export configs to clipboard + console
        </button>
    </div>
</div>

<style>
    .test-page {
        min-height: 100vh;
        background: #0f1117;
        color: #e0e0e0;
        font-family: 'Segoe UI', system-ui, sans-serif;
        padding: 1.5rem;
    }

    header {
        text-align: center;
        margin-bottom: 1.5rem;
        border-bottom: 1px solid rgba(255,255,255,0.08);
        padding-bottom: 1rem;
    }

    h1 {
        font-size: 1.4rem;
        font-weight: 600;
        letter-spacing: 0.02em;
        color: #fff;
        margin: 0;
    }

    .subtitle {
        font-size: 0.8rem;
        color: rgba(255,255,255,0.4);
        margin: 0.3rem 0 0;
    }

    h2 {
        font-size: 1rem;
        font-weight: 600;
        margin: 0 0 0.8rem;
        color: rgba(255,255,255,0.7);
        text-transform: uppercase;
        letter-spacing: 0.08em;
        font-size: 0.75rem;
    }

    .panels {
        display: flex;
        gap: 1.5rem;
        align-items: flex-start;
    }

    .panel {
        background: rgba(255,255,255,0.03);
        border: 1px solid rgba(255,255,255,0.06);
        border-radius: 8px;
        padding: 1.2rem;
    }

    .inspector { flex: 0 0 340px; }
    .chain { flex: 1; min-width: 0; }

    /* ─── Piece Tabs ─── */
    .piece-tabs {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
        margin-bottom: 0.8rem;
    }

    .tab {
        padding: 4px 10px;
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 4px;
        background: transparent;
        color: rgba(255,255,255,0.5);
        font-size: 0.75rem;
        cursor: pointer;
        transition: all 0.15s;
    }
    .tab:hover { border-color: rgba(255,255,255,0.25); color: #fff; }
    .tab.active {
        background: rgba(74,144,226,0.2);
        border-color: rgba(74,144,226,0.5);
        color: #fff;
    }

    .flip-toggle {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 0.75rem;
        color: rgba(255,255,255,0.5);
        margin-bottom: 0.6rem;
        cursor: pointer;
    }

    /* ─── Preview ─── */
    .preview-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        margin-bottom: 1rem;
    }

    .preview-grid {
        position: relative;
        margin: 2rem;
        overflow: visible;
    }

    .cell-outline {
        position: absolute;
        inset: 0;
        border: 1px dashed rgba(74,144,226,0.3);
        border-radius: 2px;
    }

    .peg-dot {
        position: absolute;
        width: 10px;
        height: 10px;
        border: 2px solid rgba(74,144,226,0.5);
        border-radius: 50%;
        transform: translate(-50%, -50%);
        z-index: 1;
    }

    .piece-svg {
        position: absolute;
        pointer-events: none;
        opacity: 0.85;
        z-index: 2;
    }

    /* ─── Markers ─── */
    .marker {
        position: absolute;
        z-index: 10;
        transform: translate(-50%, -50%);
        pointer-events: none;
    }

    .marker.centre {
        width: 16px;
        height: 16px;
    }

    .crosshair-h, .crosshair-v {
        position: absolute;
        background: #fff;
    }
    .crosshair-h {
        width: 16px; height: 2px;
        top: 7px; left: 0;
    }
    .crosshair-v {
        width: 2px; height: 16px;
        top: 0; left: 7px;
    }

    .marker.entry-left,
    .marker.entry-right,
    .marker.exit-left,
    .marker.exit-right {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        box-shadow: 0 0 6px rgba(0,0,0,0.5);
    }

    .entry-left  { background: #4ade80; }
    .entry-right { background: #60a5fa; }
    .exit-left   { background: #fb923c; }
    .exit-right  { background: #f87171; }

    .legend {
        display: flex;
        gap: 12px;
        font-size: 0.65rem;
        color: rgba(255,255,255,0.4);
        margin-top: 0.5rem;
    }

    .legend span {
        display: flex;
        align-items: center;
        gap: 4px;
    }

    .dot {
        display: inline-block;
        width: 8px;
        height: 8px;
        border-radius: 50%;
    }

    /* ─── Controls Grid ─── */
    .controls-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
    }

    fieldset {
        border: 1px solid rgba(255,255,255,0.08);
        border-radius: 4px;
        padding: 6px 8px;
        margin: 0;
    }

    fieldset legend {
        font-size: 0.65rem;
        color: rgba(255,255,255,0.35);
        padding: 0 4px;
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }

    fieldset label {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        font-size: 0.7rem;
        color: rgba(255,255,255,0.5);
        margin-right: 8px;
    }

    fieldset label.computed {
        color: rgba(255,255,255,0.3);
        font-family: monospace;
    }

    fieldset input[type="number"] {
        width: 52px;
        padding: 2px 4px;
        border: 1px solid rgba(255,255,255,0.12);
        border-radius: 3px;
        background: rgba(255,255,255,0.05);
        color: #fff;
        font-size: 0.75rem;
        font-family: monospace;
    }

    fieldset input[type="number"]:focus {
        outline: none;
        border-color: rgba(74,144,226,0.5);
    }

    /* ─── Chain Config ─── */
    .chain-config {
        display: flex;
        align-items: center;
        gap: 6px;
        flex-wrap: wrap;
        margin-bottom: 1rem;
    }

    .chain-slot-config {
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 4px 8px;
        background: rgba(255,255,255,0.03);
        border: 1px solid rgba(255,255,255,0.06);
        border-radius: 4px;
    }

    .slot-label {
        font-size: 0.65rem;
        color: rgba(255,255,255,0.35);
        font-weight: 600;
        text-transform: uppercase;
    }

    .chain-slot-config select {
        padding: 2px 4px;
        border: 1px solid rgba(255,255,255,0.12);
        border-radius: 3px;
        background: rgba(255,255,255,0.05);
        color: #fff;
        font-size: 0.7rem;
    }

    .mini-flip {
        font-size: 0.65rem;
        color: rgba(255,255,255,0.4);
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 3px;
    }

    .dir-picker {
        display: flex;
        gap: 2px;
    }

    .dir-btn {
        width: 28px;
        height: 28px;
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 3px;
        background: transparent;
        color: rgba(255,255,255,0.4);
        font-size: 1rem;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        line-height: 1;
    }
    .dir-btn:hover { border-color: rgba(255,255,255,0.25); }
    .dir-btn.active {
        background: rgba(74,144,226,0.2);
        border-color: rgba(74,144,226,0.5);
        color: #fff;
    }

    /* ─── Chain Viewport ─── */
    .chain-viewport {
        overflow: auto;
        border: 1px solid rgba(255,255,255,0.06);
        border-radius: 4px;
        background: rgba(0,0,0,0.2);
        max-height: 500px;
    }

    .chain-svg {
        display: block;
    }

    /* ─── Connection Report ─── */
    .conn-report {
        margin-top: 0.6rem;
        display: flex;
        gap: 12px;
    }

    .conn-row {
        font-size: 0.75rem;
        font-family: monospace;
        display: flex;
        gap: 6px;
        align-items: center;
    }

    .status.good { color: #4ade80; }
    .status.bad { color: #f87171; }

    /* ─── Export ─── */
    .export-bar {
        margin-top: 1rem;
        text-align: center;
    }

    .export-btn {
        padding: 8px 20px;
        border: 1px solid rgba(74,144,226,0.4);
        border-radius: 5px;
        background: rgba(74,144,226,0.1);
        color: rgba(255,255,255,0.7);
        font-size: 0.8rem;
        cursor: pointer;
        transition: all 0.2s;
    }
    .export-btn:hover {
        background: rgba(74,144,226,0.2);
        color: #fff;
    }
    .export-btn.flash {
        background: rgba(74,222,128,0.2);
        border-color: rgba(74,222,128,0.5);
        color: #4ade80;
    }
</style>