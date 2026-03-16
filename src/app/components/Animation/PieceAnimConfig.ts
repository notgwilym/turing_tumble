/**
 * PieceAnimConfig.ts
 *
 * COORDINATE SYSTEM:
 * - `centre`: fraction of piece display dimensions (0-1).
 *   {x: 0.47, y: 0.47} means peg hole is 47% from left, 47% from top.
 *
 * - `entry/exit`: offsets from centre, as fractions of piece display dimensions.
 *   x = fraction of displayWidth, y = fraction of displayHeight.
 *   {x: -0.35, y: -0.6} = 35% of width left of peg, 60% of height above peg.
 *
 * Conversion to pixels:
 *   pxX = point.x * displayWidthPx
 *   pxY = point.y * displayHeightPx
 *
 * Entry points are cell-fixed: flipping does NOT change which entry the ball uses.
 * Exit points swap and mirror-x when flipped.
 */

// ─── Core Types ──────────────────────────────────────────────────────────────

export interface Point {
    x: number;
    y: number;
}

export interface PieceDimensions {
    cmWidth: number;
    cmHeight: number;
}

export interface PieceAnimConfig {
    type: string;
    label: string;
    svgPath: string;
    viewBoxWidth: number;
    viewBoxHeight: number;
    dimensions: PieceDimensions;
    centre: Point;
    entryFromLeft: Point;
    entryFromRight: Point;
    exitToLeft: Point;
    exitToRight: Point;
    flippable: boolean;
    selfAnimates: boolean;
}

// ─── Sizing ──────────────────────────────────────────────────────────────────

const REFERENCE_CM_WIDTH = 31.7;
export const DEFAULT_GLOBAL_SCALE = 1.2;

export function getDisplayWidth(cfg: PieceAnimConfig, globalScale: number): number {
    return globalScale * (cfg.dimensions.cmWidth / REFERENCE_CM_WIDTH);
}

export function getDisplayHeight(cfg: PieceAnimConfig, globalScale: number): number {
    return globalScale * (cfg.dimensions.cmHeight / REFERENCE_CM_WIDTH);
}

export function getDisplayWidthPx(cfg: PieceAnimConfig, globalScale: number, gridSpacing: number): number {
    return getDisplayWidth(cfg, globalScale) * gridSpacing;
}

export function getDisplayHeightPx(cfg: PieceAnimConfig, globalScale: number, gridSpacing: number): number {
    return getDisplayHeight(cfg, globalScale) * gridSpacing;
}

/** Convert piece-fraction point to pixel offset from cell centre */
export function pointToPx(cfg: PieceAnimConfig, p: Point, globalScale: number, gridSpacing: number): Point {
    return {
        x: p.x * getDisplayWidthPx(cfg, globalScale, gridSpacing),
        y: p.y * getDisplayHeightPx(cfg, globalScale, gridSpacing),
    };
}

/** Convert piece-fraction point to grid fractions */
export function pointToGridFrac(cfg: PieceAnimConfig, p: Point, globalScale: number): Point {
    return {
        x: p.x * getDisplayWidth(cfg, globalScale),
        y: p.y * getDisplayHeight(cfg, globalScale),
    };
}

// ─── Flip Logic ──────────────────────────────────────────────────────────────

export function getExitPoint(cfg: PieceAnimConfig, exitDir: 'left' | 'right', flipped: boolean): Point {
    if (!flipped) return exitDir === 'left' ? cfg.exitToLeft : cfg.exitToRight;
    const raw = exitDir === 'left' ? cfg.exitToRight : cfg.exitToLeft;
    return { x: -raw.x, y: raw.y };
}

export function getEntryPoint(cfg: PieceAnimConfig, entryDir: 'left' | 'right'): Point {
    return entryDir === 'left' ? cfg.entryFromLeft : cfg.entryFromRight;
}

// ─── Constraint Checking ─────────────────────────────────────────────────────

export interface ConstraintResult {
    valid: boolean;
    dx: number;
    dy: number;
}

export function checkConstraint(
    cfgA: PieceAnimConfig, flipA: boolean, exitDir: 'left' | 'right',
    cfgB: PieceAnimConfig, globalScale: number = DEFAULT_GLOBAL_SCALE
): ConstraintResult {
    const exit = getExitPoint(cfgA, exitDir, flipA);
    const entryDir: 'left' | 'right' = exitDir === 'right' ? 'left' : 'right';
    const entry = getEntryPoint(cfgB, entryDir);

    const exitGf = pointToGridFrac(cfgA, exit, globalScale);
    const entryGf = pointToGridFrac(cfgB, entry, globalScale);

    const cellDx = exitDir === 'right' ? 1 : -1;
    const dx = cellDx + entryGf.x - exitGf.x;
    const dy = 1 + entryGf.y - exitGf.y;

    return {
        valid: (exitDir === 'right' ? dx > 0 : dx < 0) && dy > 0,
        dx, dy,
    };
}

// ─── Speed & Events ──────────────────────────────────────────────────────────

export interface SpeedKeyframe { t: number; l: number; }
export interface PathEvent { at: number; event: 'startTilt' | 'startReset' | 'startFlip' | 'startRotate'; }

export interface PiecePathConfig {
    pieceType: string;
    entryDir: 'left' | 'right';
    pathD: string;
    duration: number;
    speed: SpeedKeyframe[];
    events: PathEvent[];
}

export interface TransitionPathConfig {
    fromPiece: string;
    fromExitDir: 'left' | 'right';
    toPiece: string;
    pathD: string;
    duration: number;
    speed: SpeedKeyframe[];
}

// ─── Default Configs ─────────────────────────────────────────────────────────

export const PIECE_CONFIGS: PieceAnimConfig[] = [
    {
        type: 'bit', label: 'Bit',
        svgPath: '/src/assets/bit.svg',
        viewBoxWidth: 251, viewBoxHeight: 251,
        dimensions: { cmWidth: 24.3, cmHeight: 24.5 },
        "centre": {
            "x": 0.505,
            "y": 0.51
        },
        "entryFromLeft": {
            "x": -0.41,
            "y": -0.54
        },
        "entryFromRight": {
            "x": 0.41,
            "y": -0.54
        },
        "exitToLeft": {
            "x": -0.42,
            "y": 0.27
        },
        "exitToRight": {
            "x": 0.42,
            "y": 0.27
        },
        flippable: true, selfAnimates: true,
    },
    {
        type: 'ramp', label: 'Ramp',
        svgPath: '/src/assets/ramp.svg',
        viewBoxWidth: 260, viewBoxHeight: 180,
        dimensions: { cmWidth: 26.3, cmHeight: 18.1 },
        "centre": {
            "x": 0.5,
            "y": 0.72
        },
        "entryFromLeft": {
            "x": -0.41,
            "y": -0.79
        },
        "entryFromRight": {
            "x": 0.41,
            "y": -0.76
        },
        "exitToLeft": {
            "x": -0.53,
            "y": 0.56
        },
        "exitToRight": {
            "x": 0.53,
            "y": 0.56
        },
        flippable: true, selfAnimates: true,
    },
    {
        type: 'crossover', label: 'Crossover',
        svgPath: '/src/assets/crossover.svg',
        viewBoxWidth: 309, viewBoxHeight: 276,
        dimensions: { cmWidth: 31.7, cmHeight: 28.2 },
        "centre": {
            "x": 0.5,
            "y": 0.52
        },
        "entryFromLeft": {
            "x": -0.3,
            "y": -0.47
        },
        "entryFromRight": {
            "x": 0.3,
            "y": -0.45
        },
        "exitToLeft": {
            "x": -0.34,
            "y": 0.34
        },
        "exitToRight": {
            "x": 0.34,
            "y": 0.34
        },
        flippable: false, selfAnimates: false,
    },
    {
        type: 'interceptor', label: 'Interceptor',
        svgPath: '/src/assets/interceptor.svg',
        viewBoxWidth: 275, viewBoxHeight: 171,
        dimensions: { cmWidth: 22.2, cmHeight: 15.4 },
        "centre": {
            "x": 0.5,
            "y": 0.67
        },
        "entryFromLeft": {
            "x": -0.33,
            "y": -0.73
        },
        "entryFromRight": {
            "x": 0.33,
            "y": -0.73
        },
        "exitToLeft": {
            "x": -0.35,
            "y": 0.55
        },
        "exitToRight": {
            "x": 0.35,
            "y": 0.55
        },
        flippable: false, selfAnimates: false,
    },
    {
        type: 'gear', label: 'Gear',
        svgPath: '/src/assets/gear.svg',
        viewBoxWidth: 248, viewBoxHeight: 249,
        dimensions: { cmWidth: 25.8, cmHeight: 26.4 },
        centre: { x: 0.50, y: 0.48 },
        entryFromLeft: { x: -0.30, y: -0.45 },
        entryFromRight: { x: 0.30, y: -0.45 },
        exitToLeft: { x: -0.30, y: 0.45 },
        exitToRight: { x: 0.30, y: 0.45 },
        flippable: false, selfAnimates: true,
    },
    {
        type: 'gearbit', label: 'Gear Bit',
        svgPath: '/src/assets/gearbit.svg',
        viewBoxWidth: 259, viewBoxHeight: 259,
        dimensions: { cmWidth: 26.9, cmHeight: 27.6 },
        "centre": {
            "x": 0.48,
            "y": 0.48
        },
        "entryFromLeft": {
            "x": -0.41,
            "y": -0.49
        },
        "entryFromRight": {
            "x": 0.44,
            "y": -0.43
        },
        "exitToLeft": {
            "x": -0.42,
            "y": 0.38
        },
        "exitToRight": {
            "x": 0.42,
            "y": 0.38
        },
        flippable: true, selfAnimates: true,
    },
];

export function getConfig(type: string): PieceAnimConfig | undefined {
    return PIECE_CONFIGS.find(c => c.type === type);
}