/**
 * PieceAnimConfig.ts
 *
 * All spatial values are in GRID FRACTIONS — multiples of gridSpacing.
 * At runtime: worldPx = value * gridSpacing
 *
 * Piece display sizes are derived from cm measurements (from Affinity Designer)
 * which define relative proportions. A globalScale (grid fraction) controls
 * overall piece size. Each piece's display width =
 *   globalScale * (pieceCmWidth / referenceCmWidth)
 *
 * Entry points are cell-fixed (unaffected by piece flip).
 * Exit points swap and mirror when flipped.
 */

// ─── Core Types ──────────────────────────────────────────────────────────────

export interface Point {
    x: number; // grid fractions, positive = right
    y: number; // grid fractions, positive = down
}

export interface PieceDimensions {
    /** Width in cm as measured in Affinity Designer */
    cmWidth: number;
    /** Height in cm as measured in Affinity Designer */
    cmHeight: number;
}

export interface PieceAnimConfig {
    type: string;
    label: string;
    svgPath: string;

    /** Native SVG viewBox dimensions (for aspect ratio verification) */
    viewBoxWidth: number;
    viewBoxHeight: number;

    /** Physical dimensions from Affinity — defines inter-piece ratios */
    dimensions: PieceDimensions;

    /**
     * Peg hole position from SVG top-left, in grid fractions.
     * The piece is positioned so this point sits on the cell centre.
     */
    centre: Point;

    /**
     * Ball entry points, relative to cell centre, in grid fractions.
     * Cell-fixed: unaffected by piece flip.
     */
    entryFromLeft: Point;
    entryFromRight: Point;

    /**
     * Ball exit points, relative to cell centre, in grid fractions.
     * These swap and mirror-x when the piece is flipped.
     */
    exitToLeft: Point;
    exitToRight: Point;

    flippable: boolean;
    selfAnimates: boolean;
}

// ─── Sizing System ───────────────────────────────────────────────────────────

/** Reference piece for scaling (largest width) */
const REFERENCE_CM_WIDTH = 31.7; // crossover

/**
 * Global scale: how wide the reference piece is as a fraction of gridSpacing.
 * All other pieces scale proportionally from their cm dimensions.
 */
export const DEFAULT_GLOBAL_SCALE = 0.85;

/** Get display width in grid fractions for a piece at given global scale */
export function getDisplayWidth(cfg: PieceAnimConfig, globalScale: number): number {
    return globalScale * (cfg.dimensions.cmWidth / REFERENCE_CM_WIDTH);
}

/** Get display height in grid fractions, preserving cm aspect ratio */
export function getDisplayHeight(cfg: PieceAnimConfig, globalScale: number): number {
    return globalScale * (cfg.dimensions.cmHeight / REFERENCE_CM_WIDTH);
}

/** Convert grid-fraction value to pixels */
export function toPixels(gridFraction: number, gridSpacing: number): number {
    return gridFraction * gridSpacing;
}

/** Convert pixel value to grid fractions */
export function toGridFraction(pixels: number, gridSpacing: number): number {
    return pixels / gridSpacing;
}

// ─── Flip Logic ──────────────────────────────────────────────────────────────

/** Get effective exit point accounting for flip state */
export function getExitPoint(
    cfg: PieceAnimConfig,
    exitDir: 'left' | 'right',
    flipped: boolean
): Point {
    if (!flipped) {
        return exitDir === 'left' ? cfg.exitToLeft : cfg.exitToRight;
    }
    // Flipped: swap exit names and negate x
    const raw = exitDir === 'left' ? cfg.exitToRight : cfg.exitToLeft;
    return { x: -raw.x, y: raw.y };
}

/** Entry points are cell-fixed — flip doesn't change them */
export function getEntryPoint(
    cfg: PieceAnimConfig,
    entryDir: 'left' | 'right'
): Point {
    return entryDir === 'left' ? cfg.entryFromLeft : cfg.entryFromRight;
}

// ─── Constraint Checking ─────────────────────────────────────────────────────

export interface ConstraintResult {
    valid: boolean;
    dx: number; // transition vector x (grid fractions)
    dy: number; // transition vector y (grid fractions)
}

/**
 * Check whether a transition from pieceA's exit to pieceB's entry is valid.
 * The ball must travel downward (+y) and in the correct horizontal direction.
 *
 * For right exit: ball goes to cell (col+1, row+1), so dx should be > 0
 * For left exit:  ball goes to cell (col-1, row+1), so dx should be < 0
 */
export function checkConstraint(
    cfgA: PieceAnimConfig,
    flipA: boolean,
    exitDir: 'left' | 'right',
    cfgB: PieceAnimConfig
): ConstraintResult {
    const exit = getExitPoint(cfgA, exitDir, flipA);
    // If ball exits right from A, it enters B from the left (and vice versa)
    const entryDir = exitDir === 'right' ? 'left' : 'right';
    const entry = getEntryPoint(cfgB, entryDir);

    // Cell offset: +1 col for right exit, -1 col for left exit; always +1 row
    const cellDx = exitDir === 'right' ? 1 : -1;
    const cellDy = 1;

    // Transition vector in grid fractions
    const dx = cellDx + entry.x - exit.x;
    const dy = cellDy + entry.y - exit.y;

    // Valid if ball moves in the correct horizontal direction and downward
    const horizontalOk = exitDir === 'right' ? dx > 0 : dx < 0;
    const verticalOk = dy > 0;

    return { valid: horizontalOk && verticalOk, dx, dy };
}

// ─── Speed & Events ──────────────────────────────────────────────────────────

export interface SpeedKeyframe {
    t: number; // time fraction 0-1
    l: number; // length fraction 0-1
}

export interface PathEvent {
    at: number; // length fraction 0-1
    event: 'startTilt' | 'startReset' | 'startFlip' | 'startRotate';
}

// ─── Path Config Types ───────────────────────────────────────────────────────

export interface PiecePathConfig {
    pieceType: string;
    entryDir: 'left' | 'right';
    /** SVG path d attribute, relative to piece centre in grid fractions */
    pathD: string;
    duration: number; // ms
    speed: SpeedKeyframe[];
    events: PathEvent[];
}

export interface TransitionPathConfig {
    fromPiece: string;
    fromExitDir: 'left' | 'right';
    toPiece: string;
    /** SVG path d attribute, origin at fromPiece exit point */
    pathD: string;
    duration: number; // ms
    speed: SpeedKeyframe[];
}

// ─── Default Configs ─────────────────────────────────────────────────────────

export const PIECE_CONFIGS: PieceAnimConfig[] = [
    {
        type: 'bit',
        label: 'Bit',
        svgPath: '/src/assets/bit.svg',
        viewBoxWidth: 251,
        viewBoxHeight: 251,
        dimensions: { cmWidth: 24.3, cmHeight: 24.5 },
        centre: { x: 0.37, y: 0.37 },
        entryFromLeft:  { x: -0.22, y: -0.38 },
        entryFromRight: { x:  0.22, y: -0.38 },
        exitToLeft:     { x: -0.28, y:  0.33 },
        exitToRight:    { x:  0.28, y:  0.33 },
        flippable: true,
        selfAnimates: true,
    },
    {
        type: 'ramp',
        label: 'Ramp',
        svgPath: '/src/assets/ramp.svg',
        viewBoxWidth: 260,
        viewBoxHeight: 180,
        dimensions: { cmWidth: 26.3, cmHeight: 18.1 },
        centre: { x: 0.38, y: 0.27 },
        entryFromLeft:  { x: -0.22, y: -0.40 },
        entryFromRight: { x:  0.22, y: -0.28 },
        exitToLeft:     { x: -0.28, y:  0.28 },
        exitToRight:    { x:  0.28, y:  0.28 },
        flippable: true,
        selfAnimates: true, // tilts on contact, resets after
    },
    {
        type: 'crossover',
        label: 'Crossover',
        svgPath: '/src/assets/crossover.svg',
        viewBoxWidth: 309,
        viewBoxHeight: 276,
        dimensions: { cmWidth: 31.7, cmHeight: 28.2 },
        centre: { x: 0.42, y: 0.38 },
        entryFromLeft:  { x: -0.24, y: -0.33 },
        entryFromRight: { x:  0.24, y: -0.33 },
        exitToLeft:     { x: -0.24, y:  0.33 },
        exitToRight:    { x:  0.24, y:  0.33 },
        flippable: false,
        selfAnimates: false,
    },
    {
        type: 'interceptor',
        label: 'Interceptor',
        svgPath: '/src/assets/interceptor.svg',
        viewBoxWidth: 275,
        viewBoxHeight: 171,
        dimensions: { cmWidth: 22.2, cmHeight: 15.4 },
        centre: { x: 0.35, y: 0.22 },
        entryFromLeft:  { x: -0.22, y: -0.22 },
        entryFromRight: { x:  0.22, y: -0.22 },
        exitToLeft:     { x: -0.22, y:  0.22 },
        exitToRight:    { x:  0.22, y:  0.22 },
        flippable: false,
        selfAnimates: false,
    },
    {
        type: 'gear',
        label: 'Gear',
        svgPath: '/src/assets/gear.svg',
        viewBoxWidth: 248,
        viewBoxHeight: 249,
        dimensions: { cmWidth: 25.8, cmHeight: 26.4 },
        centre: { x: 0.35, y: 0.35 },
        entryFromLeft:  { x: -0.20, y: -0.31 },
        entryFromRight: { x:  0.20, y: -0.31 },
        exitToLeft:     { x: -0.20, y:  0.31 },
        exitToRight:    { x:  0.20, y:  0.31 },
        flippable: false,
        selfAnimates: true,
    },
    {
        type: 'gearbit',
        label: 'Gear Bit',
        svgPath: '/src/assets/gearbit.svg',
        viewBoxWidth: 259,
        viewBoxHeight: 259,
        dimensions: { cmWidth: 26.9, cmHeight: 27.6 },
        centre: { x: 0.38, y: 0.38 },
        entryFromLeft:  { x: -0.24, y: -0.38 },
        entryFromRight: { x:  0.24, y: -0.38 },
        exitToLeft:     { x: -0.28, y:  0.35 },
        exitToRight:    { x:  0.28, y:  0.35 },
        flippable: false,
        selfAnimates: true,
    },
];

/** Look up config by type string */
export function getConfig(type: string): PieceAnimConfig | undefined {
    return PIECE_CONFIGS.find(c => c.type === type);
}
