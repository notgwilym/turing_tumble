<script lang="ts">
    import {
        PIECE_CONFIGS,
        DEFAULT_GLOBAL_SCALE,
        getDisplayWidth,
        getDisplayHeight,
        getDisplayWidthPx,
        getDisplayHeightPx,
        pointToPx,
        pointToGridFrac,
        getExitPoint,
        getEntryPoint,
        checkConstraint,
        type PieceAnimConfig,
        type Point,
        type SpeedKeyframe,
        type PathEvent,
    } from './PieceAnimConfig';
    import {
        parsePath,
        serializePath,
        getPathStart,
        getPathEnd,
        toAbsolute,
        transformPathToEndpoints,
        getSqueeze,
    } from './svgPathUtils';

    // ─── Top-level State ─────────────────────────────────────────────────────

    let activeTab = $state<'points' | 'paths' | 'preview'>('points');
    let gridSpacing = $state(80);
    let globalScale = $state(DEFAULT_GLOBAL_SCALE);

    let configs = $state<PieceAnimConfig[]>(
        PIECE_CONFIGS.map(c => JSON.parse(JSON.stringify(c)))
    );

    // ─── Helpers ─────────────────────────────────────────────────────────────

    /** Piece display width in px */
    function dwPx(cfg: PieceAnimConfig): number {
        return getDisplayWidthPx(cfg, globalScale, gridSpacing);
    }
    /** Piece display height in px */
    function dhPx(cfg: PieceAnimConfig): number {
        return getDisplayHeightPx(cfg, globalScale, gridSpacing);
    }
    /** Point (piece-fraction) to px offset from cell centre */
    function ptPx(cfg: PieceAnimConfig, p: Point): Point {
        return pointToPx(cfg, p, globalScale, gridSpacing);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // TAB 1: POINT EDITOR
    // ═══════════════════════════════════════════════════════════════════════════

    let selectedIdx = $state(0);
    let flipped = $state(false);
    const cfg = $derived(configs[selectedIdx]);

    const POINT_FIELDS: {
        field: 'centre' | 'entryFromLeft' | 'entryFromRight' | 'exitToLeft' | 'exitToRight';
        label: string;
        color: string;
        isExit: boolean;
    }[] = [
        { field: 'centre', label: 'Centre (peg hole)', color: '#fff', isExit: false },
        { field: 'entryFromLeft', label: 'Entry from Left', color: '#4ade80', isExit: false },
        { field: 'entryFromRight', label: 'Entry from Right', color: '#60a5fa', isExit: false },
        { field: 'exitToLeft', label: 'Exit to Left', color: '#fb923c', isExit: true },
        { field: 'exitToRight', label: 'Exit to Right', color: '#f87171', isExit: true },
    ];

    function updatePoint(
        field: 'centre' | 'entryFromLeft' | 'entryFromRight' | 'exitToLeft' | 'exitToRight',
        axis: 'x' | 'y',
        value: number
    ) {
        configs[selectedIdx][field][axis] = value;
    }

    /**
     * Get the visual pixel offset from cell centre for a marker point,
     * accounting for flip state.
     * ALL points mirror x when the piece is flipped (they're positions on the piece geometry).
     * Centre always stays at cell centre.
     */
    function getMarkerPx(cfg: PieceAnimConfig, field: typeof POINT_FIELDS[number]): Point {
        if (field.field === 'centre') {
            return { x: 0, y: 0 };
        }
        const pt = cfg[field.field] as Point;
        const px = ptPx(cfg, pt);
        if (flipped && cfg.flippable) {
            return { x: -px.x, y: px.y };
        }
        return px;
    }

    // Constraint matrix
    const constraintMatrix = $derived.by(() => {
        const results: { pieceA: string; pieceB: string; exitDir: 'left' | 'right'; flipA: boolean; valid: boolean; dx: number; dy: number }[] = [];
        for (const a of configs) {
            const flips = a.flippable ? [false, true] : [false];
            for (const flipA of flips) {
                for (const dir of ['left', 'right'] as const) {
                    for (const b of configs) {
                        const r = checkConstraint(a, flipA, dir, b, globalScale);
                        results.push({
                            pieceA: a.type + (flipA ? ' (flip)' : ''),
                            pieceB: b.type, exitDir: dir, flipA,
                            valid: r.valid, dx: r.dx, dy: r.dy,
                        });
                    }
                }
            }
        }
        return results;
    });

    const selectedConstraints = $derived.by(() => {
        const t = cfg.type;
        return constraintMatrix.filter(c => c.pieceA.startsWith(t) || c.pieceB === t);
    });

    const failedConstraints = $derived(constraintMatrix.filter(c => !c.valid));

    // ═══════════════════════════════════════════════════════════════════════════
    // TAB 2: PATH IMPORT & TRANSFORM
    // ═══════════════════════════════════════════════════════════════════════════

    let pathMode = $state<'piece' | 'transition'>('piece');
    let pathPieceIdx = $state(0);
    let pathEntryDir = $state<'left' | 'right'>('left');
    let pathFromIdx = $state(0);
    let pathFromExitDir = $state<'left' | 'right'>('right');
    let pathFromFlipped = $state(false);
    let pathToIdx = $state(1);
    let pathInputD = $state('');
    let pathEvents = $state<PathEvent[]>([]);

    const calculatedEndpoints = $derived.by(() => {
        if (pathMode === 'piece') {
            const pc = configs[pathPieceIdx];
            const entry = getEntryPoint(pc, pathEntryDir);
            const exitDir: 'left' | 'right' = pathEntryDir === 'left' ? 'right' : 'left';
            const exit = getExitPoint(pc, exitDir, false);
            return { start: entry, end: exit, label: `${pc.type} entry-${pathEntryDir}` };
        } else {
            const fromCfg = configs[pathFromIdx];
            const toCfg = configs[pathToIdx];
            const exit = getExitPoint(fromCfg, pathFromExitDir, pathFromFlipped);
            const entryDir: 'left' | 'right' = pathFromExitDir === 'right' ? 'left' : 'right';
            const entry = getEntryPoint(toCfg, entryDir);
            const exitGf = pointToGridFrac(fromCfg, exit, globalScale);
            const entryGf = pointToGridFrac(toCfg, entry, globalScale);
            const cellDx = pathFromExitDir === 'right' ? 1 : -1;
            return {
                start: { x: 0, y: 0 },
                end: { x: cellDx + entryGf.x - exitGf.x, y: 1 + entryGf.y - exitGf.y },
                label: `${fromCfg.type}→${toCfg.type}`,
            };
        }
    });

    const parsedPath = $derived.by(() => {
        if (!pathInputD.trim()) return null;
        try {
            const cmds = parsePath(pathInputD);
            if (cmds.length === 0) return null;
            const abs = toAbsolute(cmds);
            const start = getPathStart(abs);
            const end = getPathEnd(abs);
            if (!start || !end) return null;
            return { commands: abs, start, end, rawD: serializePath(abs) };
        } catch { return null; }
    });

    const transformedPath = $derived.by(() => {
        if (!parsedPath) return null;
        const ep = calculatedEndpoints;
        const transformed = transformPathToEndpoints(parsedPath.commands, ep.start, ep.end);
        const squeeze = getSqueeze(parsedPath.commands, ep.start, ep.end);
        return { commands: transformed, d: serializePath(transformed), squeeze };
    });

    function addPathEvent() { pathEvents = [...pathEvents, { at: 0.5, event: 'startFlip' }]; }
    function removePathEvent(idx: number) { pathEvents = pathEvents.filter((_, i) => i !== idx); }

    // Saved paths
    interface SavedPath {
        key: string; mode: 'piece' | 'transition'; d: string;
        events: PathEvent[]; speed: SpeedKeyframe[]; duration: number;
    }
    let savedPaths = $state<SavedPath[]>([]);
    let saveFlash = $state(false);

    function savePath() {
        if (!transformedPath) return;
        const key = pathMode === 'piece'
            ? `ANIM_${configs[pathPieceIdx].type}_${pathEntryDir}`
            : `TRANS_${configs[pathFromIdx].type}_${pathFromExitDir}_${configs[pathToIdx].type}`;
        savedPaths = savedPaths.filter(p => p.key !== key);
        const entry: SavedPath = {
            key, mode: pathMode, d: transformedPath.d,
            events: [...pathEvents],
            speed: [{ t: 0, l: 0 }, { t: 1, l: 1 }],
            duration: 400,
        };
        savedPaths = [...savedPaths, entry];
        console.log(`Saved path: ${key}`, entry);
        saveFlash = true;
        setTimeout(() => saveFlash = false, 1200);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // TAB 3: CHAIN PREVIEW & SPEED
    // ═══════════════════════════════════════════════════════════════════════════

    let previewPieceAIdx = $state(0);
    let previewPieceAFlip = $state(false);
    let previewDir = $state<'left' | 'right'>('right');
    let previewPieceBIdx = $state(1);
    let previewPieceBFlip = $state(false);

    let speedSegment = $state<'pieceA' | 'transition' | 'pieceB'>('pieceA');
    let speedKeyframesA = $state<SpeedKeyframe[]>([{ t: 0, l: 0 }, { t: 1, l: 1 }]);
    let speedKeyframesT = $state<SpeedKeyframe[]>([{ t: 0, l: 0 }, { t: 1, l: 1 }]);
    let speedKeyframesB = $state<SpeedKeyframe[]>([{ t: 0, l: 0 }, { t: 1, l: 1 }]);
    let durationA = $state(400);
    let durationT = $state(200);
    let durationB = $state(400);

    function getActiveKf(): SpeedKeyframe[] {
        return speedSegment === 'pieceA' ? speedKeyframesA
            : speedSegment === 'transition' ? speedKeyframesT : speedKeyframesB;
    }
    function setActiveKf(kfs: SpeedKeyframe[]) {
        if (speedSegment === 'pieceA') speedKeyframesA = kfs;
        else if (speedSegment === 'transition') speedKeyframesT = kfs;
        else speedKeyframesB = kfs;
    }

    // Speed curve editor
    let draggingPtIdx = $state<number | null>(null);
    let suppressClick = $state(false);
    const CURVE_W = 260;
    const CURVE_H = 200;
    const CURVE_PAD = 24;

    function curveToSvg(t: number, l: number): Point {
        return {
            x: CURVE_PAD + t * (CURVE_W - 2 * CURVE_PAD),
            y: CURVE_PAD + (1 - l) * (CURVE_H - 2 * CURVE_PAD),
        };
    }
    function svgToCurve(svgX: number, svgY: number): { t: number; l: number } {
        return {
            t: Math.max(0, Math.min(1, (svgX - CURVE_PAD) / (CURVE_W - 2 * CURVE_PAD))),
            l: Math.max(0, Math.min(1, 1 - (svgY - CURVE_PAD) / (CURVE_H - 2 * CURVE_PAD))),
        };
    }

    function getSvgCoords(e: MouseEvent, svg: SVGSVGElement): Point {
        const rect = svg.getBoundingClientRect();
        return {
            x: (e.clientX - rect.left) * (CURVE_W / rect.width),
            y: (e.clientY - rect.top) * (CURVE_H / rect.height),
        };
    }

    function handleCurveClick(e: MouseEvent) {
        if (suppressClick) { suppressClick = false; return; }
        const svg = e.currentTarget as SVGSVGElement;
        const { x: svgX, y: svgY } = getSvgCoords(e, svg);
        const { t, l } = svgToCurve(svgX, svgY);
        if (t < 0.02 || t > 0.98) return;
        const kfs = getActiveKf();
        setActiveKf([...kfs, { t, l }].sort((a, b) => a.t - b.t));
    }

    function handleCurvePointerDown(e: PointerEvent, idx: number) {
        const kfs = getActiveKf();
        if (idx === 0 || idx === kfs.length - 1) return; // Don't touch endpoints
        e.stopPropagation();

        if (e.shiftKey || e.button === 2) {
            // Delete
            setActiveKf(kfs.filter((_, i) => i !== idx));
            suppressClick = true;
            return;
        }
        draggingPtIdx = idx;
        suppressClick = true;
        (e.currentTarget as SVGElement).setPointerCapture(e.pointerId);
    }

    function handleCurvePointerMove(e: PointerEvent) {
        if (draggingPtIdx === null) return;
        const svg = (e.currentTarget as SVGSVGElement);
        const { x: svgX, y: svgY } = getSvgCoords(e, svg);
        let { t, l } = svgToCurve(svgX, svgY);

        const kfs = getActiveKf();
        const prev = kfs[draggingPtIdx - 1];
        const next = kfs[draggingPtIdx + 1];
        if (prev) t = Math.max(prev.t + 0.01, t);
        if (next) t = Math.min(next.t - 0.01, t);

        const newKfs = [...kfs];
        newKfs[draggingPtIdx] = { t, l };
        setActiveKf(newKfs);
    }

    function handleCurvePointerUp() {
        draggingPtIdx = null;
    }

    // Ball animation
    let ballProgress = $state(0);
    let isPlaying = $state(false);
    let playbackSpeed = $state(1);
    let animFrameId = $state(0);
    let lastTimestamp = $state(0);

    function interpolateSpeed(kfs: SpeedKeyframe[], t: number): number {
        if (kfs.length < 2) return t;
        let lo = kfs[0], hi = kfs[kfs.length - 1];
        for (let i = 0; i < kfs.length - 1; i++) {
            if (t >= kfs[i].t && t <= kfs[i + 1].t) { lo = kfs[i]; hi = kfs[i + 1]; break; }
        }
        if (hi.t === lo.t) return lo.l;
        return lo.l + ((t - lo.t) / (hi.t - lo.t)) * (hi.l - lo.l);
    }

    // ─── Preview SVG layout (FIXED SIZE to prevent feedback loop) ────────────
    const PREVIEW_W = 400;
    const PREVIEW_H = 300;

    // Preview derived values
    const pvACfg = $derived(configs[previewPieceAIdx]);
    const pvBCfg = $derived(configs[previewPieceBIdx]);
    // Piece A centred in preview
    const pvACx = $derived(PREVIEW_W / 2);
    const pvACy = $derived(PREVIEW_H / 2 - gridSpacing / 2);
    // Piece B offset by direction
    const pvBCx = $derived(pvACx + (previewDir === 'right' ? 1 : -1) * gridSpacing);
    const pvBCy = $derived(pvACy + gridSpacing);

    const pvAExitDir = $derived<'left' | 'right'>(previewDir === 'right' ? 'right' : 'left');
    // Connection line endpoints: exit accounts for flip, entry is cell-fixed
    const pvAExitPt = $derived(ptPx(pvACfg, getExitPoint(pvACfg, pvAExitDir, previewPieceAFlip)));
    const pvBEntryDir = $derived<'left' | 'right'>(previewDir === 'right' ? 'left' : 'right');
    const pvBEntryPtCellFixed = $derived(ptPx(pvBCfg, getEntryPoint(pvBCfg, pvBEntryDir)));
    // Visual markers: mirror with piece flip
    const pvBEntryPtVisual = $derived.by(() => {
        const pt = ptPx(pvBCfg, getEntryPoint(pvBCfg, pvBEntryDir));
        return (previewPieceBFlip && pvBCfg.flippable) ? { x: -pt.x, y: pt.y } : pt;
    });

    const pvImgA = $derived(pieceImgProps(pvACfg, pvACx, pvACy));
    const pvImgB = $derived(pieceImgProps(pvBCfg, pvBCx, pvBCy));

    const chainAlignment = $derived.by(() => {
        const exitDir: 'left' | 'right' = previewDir === 'right' ? 'right' : 'left';
        return checkConstraint(pvACfg, previewPieceAFlip, exitDir, pvBCfg, globalScale);
    });

    // Ball position
    const ballPos = $derived.by(() => {
        const aEntryDir: 'left' | 'right' = previewDir === 'right' ? 'left' : 'right';
        const aEntry = ptPx(pvACfg, getEntryPoint(pvACfg, aEntryDir));
        const aExit = pvAExitPt;
        const bEntry = pvBEntryPtCellFixed;
        const bExitDir: 'left' | 'right' = previewDir === 'right' ? 'right' : 'left';
        const bExit = ptPx(pvBCfg, getExitPoint(pvBCfg, bExitDir, previewPieceBFlip));

        const aStartWorld = { x: pvACx + aEntry.x, y: pvACy + aEntry.y };
        const aEndWorld   = { x: pvACx + aExit.x,  y: pvACy + aExit.y };
        const bStartWorld = { x: pvBCx + bEntry.x, y: pvBCy + bEntry.y };
        const bEndWorld   = { x: pvBCx + bExit.x,  y: pvBCy + bExit.y };

        let t: number, from: Point, to: Point, kfs: SpeedKeyframe[];
        if (ballProgress < 1) {
            t = ballProgress; from = aStartWorld; to = aEndWorld; kfs = speedKeyframesA;
        } else if (ballProgress < 2) {
            t = ballProgress - 1; from = aEndWorld; to = bStartWorld; kfs = speedKeyframesT;
        } else {
            t = ballProgress - 2; from = bStartWorld; to = bEndWorld; kfs = speedKeyframesB;
        }
        const lf = interpolateSpeed(kfs, Math.min(1, Math.max(0, t)));
        return { x: from.x + (to.x - from.x) * lf, y: from.y + (to.y - from.y) * lf };
    });

    function startPreview() {
        isPlaying = true; ballProgress = 0;
        lastTimestamp = performance.now();
        animFrameId = requestAnimationFrame(animate);
    }
    function stopPreview() {
        isPlaying = false;
        if (animFrameId) cancelAnimationFrame(animFrameId);
        ballProgress = 0;
    }
    function animate(timestamp: number) {
        if (!isPlaying) return;
        const dt = (timestamp - lastTimestamp) * playbackSpeed;
        lastTimestamp = timestamp;
        const totalDuration = durationA + durationT + durationB;
        ballProgress = Math.min(3, ballProgress + (dt / totalDuration) * 3);
        if (ballProgress >= 3) { isPlaying = false; return; }
        animFrameId = requestAnimationFrame(animate);
    }

    // ─── Export ──────────────────────────────────────────────────────────────
    let exportFlash = $state(false);
    function handleExport() {
        const configsOut = configs.map(c => ({
            type: c.type, dimensions: c.dimensions, centre: c.centre,
            entryFromLeft: c.entryFromLeft, entryFromRight: c.entryFromRight,
            exitToLeft: c.exitToLeft, exitToRight: c.exitToRight,
        }));
        const pathsOut = savedPaths.map(p => ({
            key: p.key, pathD: p.d, events: p.events, speed: p.speed, duration: p.duration,
        }));
        const output = `// Auto-generated by AnimationTestPage\n// Grid: ${gridSpacing}px, Scale: ${globalScale}\n\nexport const PIECE_ANIM_CONFIGS = ${JSON.stringify(configsOut, null, 2)};\n\nexport const ANIM_PATHS = ${JSON.stringify(pathsOut, null, 2)};\n`;
        navigator.clipboard?.writeText(output);
        console.log(output);
        exportFlash = true;
        setTimeout(() => exportFlash = false, 1200);
    }

    // Helper: render a piece SVG with flip at a given centre position
    // Returns the image positioning props
    function pieceImgProps(cfg: PieceAnimConfig, cx: number, cy: number) {
        const w = dwPx(cfg);
        const h = dhPx(cfg);
        return {
            x: cx - cfg.centre.x * w,
            y: cy - cfg.centre.y * h,
            width: w,
            height: h,
        };
    }
</script>

<div class="anim-test">
    <!-- ─── Header ──────────────────────────────────────────────────────── -->
    <header class="header">
        <div class="header-left">
            <h1>Animation Pipeline</h1>
            <div class="global-controls">
                <label>
                    Grid
                    <input type="range" min="40" max="160" bind:value={gridSpacing} />
                    <span class="val">{gridSpacing}px</span>
                </label>
                <label>
                    Scale
                    <input type="range" min="0.4" max="1.2" step="0.01" bind:value={globalScale} />
                    <span class="val">{globalScale.toFixed(2)}</span>
                </label>
            </div>
        </div>
        <button class="export-btn" class:flash={exportFlash} onclick={handleExport}>
            {exportFlash ? '✓ Copied' : 'Export All'}
        </button>
    </header>

    <!-- ─── Tabs ────────────────────────────────────────────────────────── -->
    <nav class="tabs">
        <button class:active={activeTab === 'points'} onclick={() => activeTab = 'points'}>1. Points</button>
        <button class:active={activeTab === 'paths'} onclick={() => activeTab = 'paths'}>2. Paths</button>
        <button class:active={activeTab === 'preview'} onclick={() => activeTab = 'preview'}>3. Preview</button>
    </nav>

    <!-- ═══════════════════════════════════════════════════════════════════ -->
    <!-- TAB 1: POINT EDITOR                                                -->
    <!-- ═══════════════════════════════════════════════════════════════════ -->
    {#if activeTab === 'points'}
    <div class="tab-content points-tab">
        <div class="points-layout">
            <!-- Left: piece preview -->
            <div class="piece-panel">
                <div class="piece-tabs">
                    {#each configs as c, i}
                        <button class="ptab" class:active={i === selectedIdx}
                            onclick={() => { selectedIdx = i; flipped = false; }}
                        >{c.label}</button>
                    {/each}
                </div>

                {#if cfg.flippable}
                    <label class="flip-toggle">
                        <input type="checkbox" bind:checked={flipped} /> Flipped
                    </label>
                {/if}

                <!-- SVG Preview: fixed 200x200 viewport -->
                {#if cfg}
                    {@const previewSize = gridSpacing * 2}
                    {@const cx = previewSize / 2}
                    {@const cy = previewSize / 2}
                    {@const img = pieceImgProps(cfg, cx, cy)}
                    <svg class="piece-preview" width={previewSize} height={previewSize}
                        viewBox="0 0 {previewSize} {previewSize}">
                        <!-- Grid cell outline -->
                        <rect x={cx - gridSpacing / 2} y={cy - gridSpacing / 2}
                            width={gridSpacing} height={gridSpacing}
                            fill="none" stroke="#444" stroke-width="1" stroke-dasharray="4 2" />

                        <!-- Piece SVG -->
                        {#if flipped && cfg.flippable}
                            <g transform="translate({cx},{cy}) scale(-1,1) translate({-cx},{-cy})">
                                <image href={cfg.svgPath}
                                    x={img.x} y={img.y} width={img.width} height={img.height} />
                            </g>
                        {:else}
                            <image href={cfg.svgPath}
                                x={img.x} y={img.y} width={img.width} height={img.height} />
                        {/if}

                        <!-- Centre crosshair (always at cell centre) -->
                        <line x1={cx - 6} y1={cy} x2={cx + 6} y2={cy} stroke="white" stroke-width="1.5" />
                        <line x1={cx} y1={cy - 6} x2={cx} y2={cy + 6} stroke="white" stroke-width="1.5" />

                        <!-- Entry/exit markers -->
                        {#each POINT_FIELDS as field}
                            {#if field.field !== 'centre'}
                                {@const mp = getMarkerPx(cfg, field)}
                                <circle cx={cx + mp.x} cy={cy + mp.y}
                                    r="4" fill={field.color} stroke="white" stroke-width="1" />
                            {/if}
                        {/each}
                    </svg>
                {/if}

                <div class="legend">
                    <span><span class="dot" style="background:#fff"></span> Centre</span>
                    <span><span class="dot" style="background:#4ade80"></span> Entry L</span>
                    <span><span class="dot" style="background:#60a5fa"></span> Entry R</span>
                    <span><span class="dot" style="background:#fb923c"></span> Exit L</span>
                    <span><span class="dot" style="background:#f87171"></span> Exit R</span>
                </div>
            </div>

            <!-- Middle: inputs -->
            <div class="inputs-panel">
                <h3>{cfg.label} — Piece Fractions</h3>
                <div class="input-group">
                    <label class="group-label">Dimensions (cm)</label>
                    <div class="input-row">
                        <label>W <input type="number" step="0.1" value={cfg.dimensions.cmWidth}
                            oninput={(e) => configs[selectedIdx].dimensions.cmWidth = +e.currentTarget.value} /></label>
                        <label>H <input type="number" step="0.1" value={cfg.dimensions.cmHeight}
                            oninput={(e) => configs[selectedIdx].dimensions.cmHeight = +e.currentTarget.value} /></label>
                    </div>
                    <div class="computed">Display: {dwPx(cfg).toFixed(1)} × {dhPx(cfg).toFixed(1)}px</div>
                </div>

                {#each POINT_FIELDS as field}
                    <div class="input-group">
                        <label class="group-label" style="color:{field.color}">{field.label}</label>
                        <div class="input-row">
                            <label>X <input type="number" step="0.01"
                                value={cfg[field.field].x}
                                oninput={(e) => updatePoint(field.field, 'x', +e.currentTarget.value)} /></label>
                            <label>Y <input type="number" step="0.01"
                                value={cfg[field.field].y}
                                oninput={(e) => updatePoint(field.field, 'y', +e.currentTarget.value)} /></label>
                        </div>
                        {#if field.field !== 'centre'}
                            <div class="computed">
                                → {ptPx(cfg, cfg[field.field] as Point).x.toFixed(1)}, {ptPx(cfg, cfg[field.field] as Point).y.toFixed(1)}px from centre
                            </div>
                        {:else}
                            <div class="computed">
                                → peg at {(cfg.centre.x * dwPx(cfg)).toFixed(1)}, {(cfg.centre.y * dhPx(cfg)).toFixed(1)}px from SVG top-left
                            </div>
                        {/if}
                    </div>
                {/each}
            </div>

            <!-- Right: constraints -->
            <div class="constraints-panel">
                <h3>Constraints</h3>
                {#if failedConstraints.length === 0}
                    <div class="all-ok">✓ All {constraintMatrix.length} valid</div>
                {:else}
                    <div class="fail-count">✗ {failedConstraints.length} / {constraintMatrix.length} invalid</div>
                {/if}
                <div class="constraint-list">
                    <div class="constraint-header">
                        <span>From</span><span>Dir</span><span>To</span><span>dx</span><span>dy</span><span></span>
                    </div>
                    {#each failedConstraints as c}
                        <div class="constraint-row fail">
                            <span>{c.pieceA}</span><span>{c.exitDir === 'right' ? '↘' : '↙'}</span>
                            <span>{c.pieceB}</span><span>{c.dx.toFixed(2)}</span><span>{c.dy.toFixed(2)}</span>
                            <span class="status">✗</span>
                        </div>
                    {/each}
                    {#if failedConstraints.length > 0}<hr />{/if}
                    {#each selectedConstraints.filter(c => c.valid) as c}
                        <div class="constraint-row ok">
                            <span>{c.pieceA}</span><span>{c.exitDir === 'right' ? '↘' : '↙'}</span>
                            <span>{c.pieceB}</span><span>{c.dx.toFixed(2)}</span><span>{c.dy.toFixed(2)}</span>
                            <span class="status">✓</span>
                        </div>
                    {/each}
                </div>
            </div>
        </div>
    </div>
    {/if}

    <!-- ═══════════════════════════════════════════════════════════════════ -->
    <!-- TAB 2: PATH IMPORT & TRANSFORM                                     -->
    <!-- ═══════════════════════════════════════════════════════════════════ -->
    {#if activeTab === 'paths'}
    <div class="tab-content paths-tab">
        <div class="paths-layout">
            <div class="path-setup">
                <div class="mode-toggle">
                    <button class:active={pathMode === 'piece'} onclick={() => pathMode = 'piece'}>Piece Path</button>
                    <button class:active={pathMode === 'transition'} onclick={() => pathMode = 'transition'}>Transition</button>
                </div>

                {#if pathMode === 'piece'}
                    <div class="path-selectors">
                        <label>Piece <select bind:value={pathPieceIdx}>
                            {#each configs as c, i}<option value={i}>{c.label}</option>{/each}
                        </select></label>
                        <label>Entry <select bind:value={pathEntryDir}>
                            <option value="left">Left</option><option value="right">Right</option>
                        </select></label>
                    </div>
                {:else}
                    <div class="path-selectors">
                        <label>From <select bind:value={pathFromIdx}>
                            {#each configs as c, i}<option value={i}>{c.label}</option>{/each}
                        </select></label>
                        <label>Exit <select bind:value={pathFromExitDir}>
                            <option value="left">Left</option><option value="right">Right</option>
                        </select></label>
                        <label class="flip-toggle-sm"><input type="checkbox" bind:checked={pathFromFlipped} /> Flip</label>
                        <label>To <select bind:value={pathToIdx}>
                            {#each configs as c, i}<option value={i}>{c.label}</option>{/each}
                        </select></label>
                    </div>
                {/if}

                <div class="endpoints">
                    <h4>Calculated Endpoints</h4>
                    <div class="ep-row">
                        <span class="ep-label" style="color:#4ade80">Start</span>
                        <span>({calculatedEndpoints.start.x.toFixed(3)}, {calculatedEndpoints.start.y.toFixed(3)})</span>
                    </div>
                    <div class="ep-row">
                        <span class="ep-label" style="color:#f87171">End</span>
                        <span>({calculatedEndpoints.end.x.toFixed(3)}, {calculatedEndpoints.end.y.toFixed(3)})</span>
                    </div>
                </div>

                <label class="path-input-label">
                    SVG Path (d attribute)
                    <textarea class="path-input" placeholder='Paste d="..." from Affinity'
                        bind:value={pathInputD} rows="5"></textarea>
                </label>

                {#if parsedPath}
                    <div class="path-info">
                        <span>Authored: ({parsedPath.start.x.toFixed(1)}, {parsedPath.start.y.toFixed(1)}) → ({parsedPath.end.x.toFixed(1)}, {parsedPath.end.y.toFixed(1)})</span>
                        {#if transformedPath}
                            <span>Squeeze: x={transformedPath.squeeze.scaleX.toFixed(3)}, y={transformedPath.squeeze.scaleY.toFixed(3)}</span>
                        {/if}
                    </div>
                {/if}

                {#if pathMode === 'piece'}
                    <div class="events-section">
                        <h4>Events <button class="add-btn" onclick={addPathEvent}>+</button></h4>
                        {#each pathEvents as evt, i}
                            <div class="event-row">
                                <input type="number" min="0" max="1" step="0.01" bind:value={pathEvents[i].at} />
                                <select bind:value={pathEvents[i].event}>
                                    <option value="startTilt">startTilt</option>
                                    <option value="startReset">startReset</option>
                                    <option value="startFlip">startFlip</option>
                                    <option value="startRotate">startRotate</option>
                                </select>
                                <button class="del-btn" onclick={() => removePathEvent(i)}>×</button>
                            </div>
                        {/each}
                    </div>
                {/if}

                <button class="save-btn" class:flash={saveFlash} onclick={savePath} disabled={!transformedPath}>
                    {saveFlash ? '✓ Saved!' : `Save (${pathMode === 'piece'
                        ? `ANIM_${configs[pathPieceIdx].type}_${pathEntryDir}`
                        : `TRANS_${configs[pathFromIdx].type}_${pathFromExitDir}_${configs[pathToIdx].type}`})`}
                </button>
            </div>

            <div class="path-previews">
                {#if parsedPath}
                    <div class="preview-box">
                        <h4>Authored (raw)</h4>
                        <svg width="280" height="280"
                            viewBox="{parsedPath.start.x - 20} {parsedPath.start.y - 20} {Math.abs(parsedPath.end.x - parsedPath.start.x) + 40} {Math.abs(parsedPath.end.y - parsedPath.start.y) + 40}">
                            <path d={parsedPath.rawD} fill="none" stroke="#888" stroke-width="1" />
                            <circle cx={parsedPath.start.x} cy={parsedPath.start.y} r="3" fill="#4ade80" />
                            <circle cx={parsedPath.end.x} cy={parsedPath.end.y} r="3" fill="#f87171" />
                        </svg>
                    </div>
                    {#if transformedPath}
                        {@const ep = calculatedEndpoints}
                        {@const minX = Math.min(ep.start.x, ep.end.x)}
                        {@const minY = Math.min(ep.start.y, ep.end.y)}
                        {@const rangeX = Math.abs(ep.end.x - ep.start.x) || 0.1}
                        {@const rangeY = Math.abs(ep.end.y - ep.start.y) || 0.1}
                        <div class="preview-box">
                            <h4>Transformed</h4>
                            <svg width="280" height="280"
                                viewBox="{minX - 0.1} {minY - 0.1} {rangeX + 0.2} {rangeY + 0.2}">
                                <path d={transformedPath.d} fill="none" stroke="#e0e0e0" stroke-width="0.01" />
                                <circle cx={ep.start.x} cy={ep.start.y} r="0.02" fill="#4ade80" />
                                <circle cx={ep.end.x} cy={ep.end.y} r="0.02" fill="#f87171" />
                            </svg>
                        </div>
                    {/if}
                {:else}
                    <div class="preview-box empty"><p>Paste an SVG path to see preview</p></div>
                {/if}

                {#if savedPaths.length > 0}
                    <div class="saved-list">
                        <h4>Saved ({savedPaths.length})</h4>
                        {#each savedPaths as sp}
                            <div class="saved-item">{sp.key}</div>
                        {/each}
                    </div>
                {/if}
            </div>
        </div>
    </div>
    {/if}

    <!-- ═══════════════════════════════════════════════════════════════════ -->
    <!-- TAB 3: CHAIN PREVIEW & SPEED                                       -->
    <!-- ═══════════════════════════════════════════════════════════════════ -->
    {#if activeTab === 'preview'}
    <div class="tab-content preview-tab">
        <div class="preview-layout">
            <div class="preview-controls">
                <!-- Chain setup -->
                <div class="chain-setup">
                    <h3>Chain</h3>
                    <div class="chain-piece">
                        <label>A <select bind:value={previewPieceAIdx}>
                            {#each configs as c, i}<option value={i}>{c.label}</option>{/each}
                        </select></label>
                        {#if configs[previewPieceAIdx].flippable}
                            <label class="flip-toggle-sm"><input type="checkbox" bind:checked={previewPieceAFlip} /> Flip</label>
                        {/if}
                    </div>
                    <div class="chain-dir">
                        <button class:active={previewDir === 'left'} onclick={() => previewDir = 'left'}>↙</button>
                        <button class:active={previewDir === 'right'} onclick={() => previewDir = 'right'}>↘</button>
                    </div>
                    <div class="chain-piece">
                        <label>B <select bind:value={previewPieceBIdx}>
                            {#each configs as c, i}<option value={i}>{c.label}</option>{/each}
                        </select></label>
                        {#if configs[previewPieceBIdx].flippable}
                            <label class="flip-toggle-sm"><input type="checkbox" bind:checked={previewPieceBFlip} /> Flip</label>
                        {/if}
                    </div>
                    <div class="alignment" class:valid={chainAlignment.valid} class:invalid={!chainAlignment.valid}>
                        {chainAlignment.valid ? '✓' : '✗'} dx={chainAlignment.dx.toFixed(2)} dy={chainAlignment.dy.toFixed(2)}
                    </div>
                </div>

                <!-- Speed curve -->
                <div class="speed-section">
                    <h3>Speed Curve</h3>
                    <div class="speed-tabs">
                        <button class:active={speedSegment === 'pieceA'} onclick={() => speedSegment = 'pieceA'}>A ({durationA}ms)</button>
                        <button class:active={speedSegment === 'transition'} onclick={() => speedSegment = 'transition'}>Trans ({durationT}ms)</button>
                        <button class:active={speedSegment === 'pieceB'} onclick={() => speedSegment = 'pieceB'}>B ({durationB}ms)</button>
                    </div>
                    <div class="duration-input">
                        <label>Duration <input type="number" min="50" step="50"
                            value={speedSegment === 'pieceA' ? durationA : speedSegment === 'transition' ? durationT : durationB}
                            oninput={(e) => {
                                const v = +e.currentTarget.value;
                                if (speedSegment === 'pieceA') durationA = v;
                                else if (speedSegment === 'transition') durationT = v;
                                else durationB = v;
                            }} /> ms</label>
                    </div>

                    <!-- svelte-ignore a11y_no_static_element_interactions -->
                    <svg class="speed-curve" width={CURVE_W} height={CURVE_H}
                        viewBox="0 0 {CURVE_W} {CURVE_H}"
                        onclick={handleCurveClick}
                        onpointermove={handleCurvePointerMove}
                        onpointerup={handleCurvePointerUp}
                        onpointerleave={handleCurvePointerUp}
                        oncontextmenu={(e) => e.preventDefault()}>
                        <rect x="0" y="0" width={CURVE_W} height={CURVE_H} fill="#1a1a2e" rx="4" />
                        <!-- Grid -->
                        {#each [0.25, 0.5, 0.75] as v}
                            {@const p = curveToSvg(v, 0)}
                            <line x1={p.x} y1={CURVE_PAD} x2={p.x} y2={CURVE_H - CURVE_PAD} stroke="#333" stroke-width="0.5" />
                        {/each}
                        {#each [0.25, 0.5, 0.75] as v}
                            {@const p = curveToSvg(0, v)}
                            <line x1={CURVE_PAD} y1={p.y} x2={CURVE_W - CURVE_PAD} y2={p.y} stroke="#333" stroke-width="0.5" />
                        {/each}
                        <!-- Diagonal ref -->
                        <line x1={curveToSvg(0, 0).x} y1={curveToSvg(0, 0).y}
                            x2={curveToSvg(1, 1).x} y2={curveToSvg(1, 1).y}
                            stroke="#555" stroke-width="0.5" stroke-dasharray="3 3" />
                        <!-- Labels -->
                        <text x={CURVE_W / 2} y={CURVE_H - 4} text-anchor="middle" fill="#666" font-size="9">time →</text>
                        <!-- Curve -->
                        {#if getActiveKf().length >= 2}
                            <polyline fill="none" stroke="#818cf8" stroke-width="2"
                                points={getActiveKf().map(k => { const p = curveToSvg(k.t, k.l); return `${p.x},${p.y}`; }).join(' ')} />
                        {/if}
                        <!-- Points -->
                        {#each getActiveKf() as kf, i}
                            {@const p = curveToSvg(kf.t, kf.l)}
                            {@const isEndpoint = i === 0 || i === getActiveKf().length - 1}
                            <circle cx={p.x} cy={p.y}
                                r={isEndpoint ? 4 : 5}
                                fill={isEndpoint ? '#555' : '#818cf8'}
                                stroke="white" stroke-width="1.5"
                                style="cursor: {isEndpoint ? 'default' : 'grab'}; touch-action: none;"
                                onpointerdown={(e) => handleCurvePointerDown(e, i)} />
                        {/each}
                    </svg>
                    <div class="speed-hint">Click to add · Drag to move · Shift-click to delete</div>
                </div>

                <!-- Playback -->
                <div class="playback">
                    <button onclick={startPreview} disabled={isPlaying}>▶ Play</button>
                    <button onclick={stopPreview}>■ Stop</button>
                    <label>Speed <input type="range" min="0.1" max="3" step="0.1" bind:value={playbackSpeed} />
                        <span class="val">{playbackSpeed.toFixed(1)}×</span></label>
                </div>
            </div>

            <!-- Chain preview: FIXED SIZE SVG -->
            <div class="chain-preview-area">
                <svg class="chain-svg" width={PREVIEW_W} height={PREVIEW_H}
                    viewBox="0 0 {PREVIEW_W} {PREVIEW_H}">
                    <!-- Grid bg -->
                    {#each Array(Math.ceil(PREVIEW_W / gridSpacing)) as _, col}
                        {#each Array(Math.ceil(PREVIEW_H / gridSpacing)) as _, row}
                            <rect x={col * gridSpacing} y={row * gridSpacing}
                                width={gridSpacing} height={gridSpacing}
                                fill="none" stroke="#333" stroke-width="0.5" />
                        {/each}
                    {/each}

                    <!-- Piece A -->
                    {#if previewPieceAFlip && pvACfg.flippable}
                        <g transform="translate({pvACx},{pvACy}) scale(-1,1) translate({-pvACx},{-pvACy})">
                            <image href={pvACfg.svgPath} x={pvImgA.x} y={pvImgA.y} width={pvImgA.width} height={pvImgA.height} />
                        </g>
                    {:else}
                        <image href={pvACfg.svgPath} x={pvImgA.x} y={pvImgA.y} width={pvImgA.width} height={pvImgA.height} />
                    {/if}
                    <circle cx={pvACx} cy={pvACy} r="2" fill="white" opacity="0.5" />

                    <!-- Piece B -->
                    {#if previewPieceBFlip && pvBCfg.flippable}
                        <g transform="translate({pvBCx},{pvBCy}) scale(-1,1) translate({-pvBCx},{-pvBCy})">
                            <image href={pvBCfg.svgPath} x={pvImgB.x} y={pvImgB.y} width={pvImgB.width} height={pvImgB.height} />
                        </g>
                    {:else}
                        <image href={pvBCfg.svgPath} x={pvImgB.x} y={pvImgB.y} width={pvImgB.width} height={pvImgB.height} />
                    {/if}
                    <circle cx={pvBCx} cy={pvBCy} r="2" fill="white" opacity="0.5" />

                    <!-- Connection line (cell-fixed entry on B) -->
                    <line x1={pvACx + pvAExitPt.x} y1={pvACy + pvAExitPt.y}
                        x2={pvBCx + pvBEntryPtCellFixed.x} y2={pvBCy + pvBEntryPtCellFixed.y}
                        stroke={chainAlignment.valid ? '#4ade80' : '#f87171'} stroke-width="1"
                        stroke-dasharray={chainAlignment.valid ? 'none' : '4 2'} />

                    <!-- Markers: exit on A, entry on B (visual/flipped) -->
                    <circle cx={pvACx + pvAExitPt.x} cy={pvACy + pvAExitPt.y}
                        r="3" fill="#fb923c" stroke="white" stroke-width="1" />
                    <circle cx={pvBCx + pvBEntryPtVisual.x} cy={pvBCy + pvBEntryPtVisual.y}
                        r="3" fill="#4ade80" stroke="white" stroke-width="1" />
                    <!-- Cell-fixed entry (small, semi-transparent if different from visual) -->
                    {#if previewPieceBFlip && pvBCfg.flippable}
                        <circle cx={pvBCx + pvBEntryPtCellFixed.x} cy={pvBCy + pvBEntryPtCellFixed.y}
                            r="2" fill="none" stroke="#4ade80" stroke-width="1" stroke-dasharray="2 1" opacity="0.5" />
                    {/if}

                    <!-- Ball -->
                    <circle cx={ballPos.x} cy={ballPos.y}
                        r="6" fill="#ef4444" stroke="white" stroke-width="1.5"
                        opacity={isPlaying || ballProgress > 0 ? 1 : 0.3} />
                </svg>
            </div>
        </div>
    </div>
    {/if}
</div>

<style>
    .anim-test {
        font-family: 'JetBrains Mono', 'SF Mono', 'Fira Code', monospace;
        background: #0d0d14; color: #e0e0e0; min-height: 100vh; font-size: 12px;
    }
    .header {
        display: flex; justify-content: space-between; align-items: center;
        padding: 12px 16px; border-bottom: 1px solid #222; background: #111;
    }
    .header-left { display: flex; align-items: center; gap: 24px; }
    .header h1 { font-size: 14px; font-weight: 600; margin: 0; color: #818cf8; }
    .global-controls { display: flex; gap: 16px; }
    .global-controls label { display: flex; align-items: center; gap: 6px; color: #888; }
    .global-controls input[type="range"] { width: 80px; }
    .val { color: #aaa; min-width: 40px; }
    .export-btn {
        padding: 6px 14px; background: #1e1e30; border: 1px solid #333;
        border-radius: 4px; color: #818cf8; cursor: pointer; font-size: 11px; font-family: inherit;
    }
    .export-btn:hover { background: #2a2a40; }
    .export-btn.flash, .save-btn.flash { background: #065f46; color: #6ee7b7; border-color: #6ee7b7; }

    .tabs { display: flex; border-bottom: 1px solid #222; background: #111; }
    .tabs button {
        padding: 8px 20px; background: none; border: none; border-bottom: 2px solid transparent;
        color: #666; cursor: pointer; font-size: 12px; font-family: inherit;
    }
    .tabs button.active { color: #818cf8; border-bottom-color: #818cf8; }
    .tab-content { padding: 16px; }

    /* Tab 1 */
    .points-layout { display: flex; gap: 16px; }
    .piece-panel { flex: 0 0 auto; }
    .inputs-panel { flex: 0 0 240px; }
    .constraints-panel { flex: 1; min-width: 0; overflow-y: auto; max-height: 80vh; }

    .piece-tabs { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 8px; }
    .ptab {
        padding: 4px 8px; background: #1a1a2e; border: 1px solid #333;
        border-radius: 3px; color: #aaa; cursor: pointer; font-size: 11px; font-family: inherit;
    }
    .ptab.active { background: #2a2a50; color: #818cf8; border-color: #818cf8; }
    .flip-toggle { display: flex; align-items: center; gap: 6px; margin-bottom: 8px; color: #888; }
    .piece-preview { background: #111; border-radius: 4px; border: 1px solid #222; }
    .legend { display: flex; gap: 8px; margin-top: 6px; flex-wrap: wrap; }
    .legend span { display: flex; align-items: center; gap: 3px; color: #888; font-size: 10px; }
    .dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; }

    .input-group { margin-bottom: 8px; }
    .group-label { font-size: 11px; font-weight: 600; display: block; margin-bottom: 2px; }
    .input-row { display: flex; gap: 6px; }
    .input-row label { display: flex; align-items: center; gap: 4px; color: #888; font-size: 11px; }
    .input-row input[type="number"] {
        width: 64px; padding: 2px 4px; background: #1a1a2e; border: 1px solid #333;
        border-radius: 3px; color: #e0e0e0; font-size: 11px; font-family: inherit;
    }
    .computed { color: #555; font-size: 10px; margin-top: 1px; }
    h3 { font-size: 13px; margin: 0 0 8px 0; color: #aaa; }

    .all-ok { color: #4ade80; font-size: 11px; margin-bottom: 8px; }
    .fail-count { color: #f87171; font-size: 11px; margin-bottom: 8px; }
    .constraint-list { font-size: 10px; }
    .constraint-header {
        display: grid; grid-template-columns: 2fr 1fr 1.5fr 1fr 1fr 1fr;
        gap: 4px; padding: 2px 0; border-bottom: 1px solid #333; color: #666;
    }
    .constraint-row {
        display: grid; grid-template-columns: 2fr 1fr 1.5fr 1fr 1fr 1fr;
        gap: 4px; padding: 2px 0; border-bottom: 1px solid #1a1a1a;
    }
    .constraint-row.fail { color: #f87171; }
    .constraint-row.ok { color: #666; }
    .status { text-align: center; }
    .constraints-panel hr { border: none; border-top: 1px solid #333; margin: 4px 0; }

    /* Tab 2 */
    .paths-layout { display: flex; gap: 16px; }
    .path-setup { flex: 0 0 320px; }
    .path-previews { flex: 1; display: flex; flex-wrap: wrap; gap: 12px; align-items: flex-start; }
    .mode-toggle { display: flex; gap: 0; margin-bottom: 12px; }
    .mode-toggle button {
        padding: 5px 12px; background: #1a1a2e; border: 1px solid #333;
        color: #888; cursor: pointer; font-size: 11px; font-family: inherit;
    }
    .mode-toggle button:first-child { border-radius: 3px 0 0 3px; }
    .mode-toggle button:last-child { border-radius: 0 3px 3px 0; }
    .mode-toggle button.active { background: #2a2a50; color: #818cf8; border-color: #818cf8; }
    .path-selectors { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; }
    .path-selectors label { display: flex; align-items: center; gap: 4px; color: #888; font-size: 11px; }
    .path-selectors select, .chain-piece select {
        padding: 3px 6px; background: #1a1a2e; border: 1px solid #333;
        border-radius: 3px; color: #e0e0e0; font-size: 11px; font-family: inherit;
    }
    .flip-toggle-sm { display: flex; align-items: center; gap: 4px; color: #888; font-size: 11px; }
    .endpoints { background: #111; border: 1px solid #222; border-radius: 4px; padding: 8px; margin-bottom: 12px; }
    .endpoints h4 { margin: 0 0 4px 0; font-size: 11px; color: #888; }
    .ep-row { display: flex; gap: 8px; align-items: center; font-size: 11px; }
    .ep-label { font-weight: 600; min-width: 36px; }
    .path-input-label { display: block; margin-bottom: 12px; color: #888; font-size: 11px; }
    .path-input {
        width: 100%; margin-top: 4px; padding: 6px; background: #0a0a14;
        border: 1px solid #333; border-radius: 4px; color: #e0e0e0;
        font-family: inherit; font-size: 11px; resize: vertical;
    }
    .path-info { font-size: 10px; color: #888; margin-bottom: 8px; display: flex; flex-direction: column; gap: 2px; }
    .events-section { margin-bottom: 12px; }
    .events-section h4 { display: flex; align-items: center; gap: 8px; font-size: 11px; color: #888; margin: 0 0 4px 0; }
    .add-btn {
        padding: 1px 6px; background: #1a1a2e; border: 1px solid #333;
        border-radius: 3px; color: #818cf8; cursor: pointer; font-size: 12px; font-family: inherit;
    }
    .event-row { display: flex; gap: 6px; align-items: center; margin-bottom: 4px; }
    .event-row input[type="number"] {
        width: 50px; padding: 2px 4px; background: #1a1a2e; border: 1px solid #333;
        border-radius: 3px; color: #e0e0e0; font-size: 11px; font-family: inherit;
    }
    .event-row select {
        padding: 2px 4px; background: #1a1a2e; border: 1px solid #333;
        border-radius: 3px; color: #e0e0e0; font-size: 11px; font-family: inherit;
    }
    .del-btn {
        padding: 1px 5px; background: none; border: 1px solid #333;
        border-radius: 3px; color: #f87171; cursor: pointer; font-size: 12px; font-family: inherit;
    }
    .save-btn {
        width: 100%; padding: 6px; background: #1e1e30; border: 1px solid #333;
        border-radius: 4px; color: #818cf8; cursor: pointer; font-size: 11px; font-family: inherit;
    }
    .save-btn:hover { background: #2a2a40; }
    .save-btn:disabled { opacity: 0.4; cursor: default; }
    .preview-box { background: #111; border: 1px solid #222; border-radius: 4px; padding: 8px; }
    .preview-box h4 { margin: 0 0 4px 0; font-size: 11px; color: #888; }
    .preview-box.empty { display: flex; align-items: center; justify-content: center; min-height: 200px; }
    .preview-box.empty p { color: #444; }
    .preview-box svg { background: #0a0a14; border-radius: 3px; display: block; }
    .saved-list { width: 100%; }
    .saved-list h4 { font-size: 11px; color: #888; margin: 0 0 4px 0; }
    .saved-item {
        padding: 3px 6px; background: #1a1a2e; border: 1px solid #222;
        border-radius: 3px; font-size: 10px; color: #818cf8; margin-bottom: 2px;
    }

    /* Tab 3 */
    .preview-layout { display: flex; gap: 16px; }
    .preview-controls { flex: 0 0 300px; }
    .chain-preview-area { flex: 0 0 auto; } /* Fixed, not flex-1 */
    .chain-setup { margin-bottom: 16px; }
    .chain-piece { display: flex; gap: 8px; align-items: center; margin-bottom: 6px; }
    .chain-piece label { display: flex; align-items: center; gap: 4px; color: #888; font-size: 11px; }
    .chain-dir { display: flex; gap: 4px; margin: 4px 0; padding-left: 20px; }
    .chain-dir button {
        padding: 3px 10px; background: #1a1a2e; border: 1px solid #333;
        border-radius: 3px; color: #888; cursor: pointer; font-size: 14px; font-family: inherit;
    }
    .chain-dir button.active { background: #2a2a50; color: #818cf8; border-color: #818cf8; }
    .alignment { font-size: 11px; padding: 4px 8px; border-radius: 3px; margin-top: 4px; }
    .alignment.valid { background: #052e16; color: #4ade80; }
    .alignment.invalid { background: #450a0a; color: #f87171; }
    .speed-section { margin-bottom: 16px; }
    .speed-tabs { display: flex; gap: 0; margin-bottom: 8px; }
    .speed-tabs button {
        padding: 4px 10px; background: #1a1a2e; border: 1px solid #333;
        color: #888; cursor: pointer; font-size: 10px; font-family: inherit;
    }
    .speed-tabs button:first-child { border-radius: 3px 0 0 3px; }
    .speed-tabs button:last-child { border-radius: 0 3px 3px 0; }
    .speed-tabs button.active { background: #2a2a50; color: #818cf8; border-color: #818cf8; }
    .duration-input { margin-bottom: 8px; }
    .duration-input label { display: flex; align-items: center; gap: 6px; color: #888; font-size: 11px; }
    .duration-input input[type="number"] {
        width: 60px; padding: 2px 4px; background: #1a1a2e; border: 1px solid #333;
        border-radius: 3px; color: #e0e0e0; font-size: 11px; font-family: inherit;
    }
    .speed-curve { border: 1px solid #222; border-radius: 4px; cursor: crosshair; display: block; user-select: none; }
    .speed-hint { font-size: 9px; color: #444; margin-top: 4px; }
    .playback { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
    .playback button {
        padding: 5px 12px; background: #1a1a2e; border: 1px solid #333;
        border-radius: 3px; color: #aaa; cursor: pointer; font-size: 11px; font-family: inherit;
    }
    .playback button:hover { background: #2a2a40; }
    .playback button:disabled { opacity: 0.4; cursor: default; }
    .playback label { display: flex; align-items: center; gap: 4px; color: #888; font-size: 11px; }
    .playback input[type="range"] { width: 60px; }
    .chain-svg { background: #111; border: 1px solid #222; border-radius: 4px; display: block; }
</style>