/**
 * PieceAnimConfig.ts
 * 
 * Spatial metadata for each piece type:
 *  1. Positioning the SVG so its peg-hole aligns with the grid cell centre
 *  2. Defining ball entry/exit points for animation handover
 * 
 * All pixel values are relative to the piece's CENTRE POINT (the peg hole),
 * measured at the piece's display size. Positive X = right, positive Y = down.
 * 
 * displayHeight is auto-computed from displayWidth using the SVG's native
 * viewBox aspect ratio, ensuring no internal padding.
 */

export interface PiecePoint {
    x: number;
    y: number;
}

export interface PieceAnimConfig {
    type: string;
    label: string;
    svgPath: string;

    /** Native SVG viewBox dimensions */
    viewBoxWidth: number;
    viewBoxHeight: number;

    /** Display width (px). Height is derived from aspect ratio. */
    displayWidth: number;

    /** Peg hole position, from SVG top-left at display size */
    centre: PiecePoint;

    /** Ball entry points, relative to centre. Cell-fixed (unaffected by flip). */
    entryFromLeft: PiecePoint;
    entryFromRight: PiecePoint;

    /** Ball exit points, relative to centre. Move with the piece (swap on flip). */
    exitToLeft: PiecePoint;
    exitToRight: PiecePoint;

    flippable: boolean;
    selfAnimates: boolean;
}

export function getDisplayHeight(cfg: PieceAnimConfig): number {
    return cfg.displayWidth * (cfg.viewBoxHeight / cfg.viewBoxWidth);
}

export const PIECE_CONFIGS: PieceAnimConfig[] = [
    {
        type: 'bit',
        label: 'Bit',
        svgPath: '/src/assets/bit.svg',
        viewBoxWidth: 220,
        viewBoxHeight: 220,
        displayWidth: 79,
        centre: { x: 40, y: 40 },
        entryFromLeft:  { x: -37, y: -44 },
        entryFromRight: { x:  37, y: -44 },
        exitToLeft:     { x: -37, y:  25 },
        exitToRight:    { x:  37, y:  25 },
        flippable: true,
        selfAnimates: true,
    },
    {
        type: 'ramp',
        label: 'Ramp',
        svgPath: '/src/assets/ramp.svg',
        viewBoxWidth: 256,  
        viewBoxHeight: 176, 
        displayWidth: 90,
        centre: { x: 45, y: 45 },
        entryFromLeft:  { x: -37, y: -49 },
        entryFromRight: { x:  37, y: -49 },
        exitToLeft:     { x: -37, y:  25 },
        exitToRight:    { x:  37, y:  25 },
        flippable: true,
        selfAnimates: false,
    },
    {
        type: 'crossover',
        label: 'Crossover',
        svgPath: '/src/assets/crossover.svg',
        viewBoxWidth: 309,
        viewBoxHeight: 276,
        displayWidth: 95,
        centre: { x: 47, y: 45 },
        entryFromLeft:  { x: -27, y: -43 },
        entryFromRight: { x:  27, y: -43 },
        exitToLeft:     { x: -30, y:  29 },
        exitToRight:    { x:  30, y:  29 },
        flippable: false,
        selfAnimates: false,
    },
    {
        type: 'interceptor',
        label: 'Interceptor',
        svgPath: '/src/assets/interceptor.svg',
        viewBoxWidth: 275,
        viewBoxHeight: 171,
        displayWidth: 90,
        centre: { x: 45, y: 38 },
        entryFromLeft:  { x: -28, y: -41 },
        entryFromRight: { x:  28, y: -41 },
        exitToLeft:     { x: -28, y:  28 },
        exitToRight:    { x:  28, y:  28 },
        flippable: false,
        selfAnimates: false,
    },
    {
        type: 'gear',
        label: 'Gear',
        svgPath: '/src/assets/gear.svg',
        viewBoxWidth: 248,
        viewBoxHeight: 249,
        displayWidth: 80,
        centre: { x: 40, y: 40 },
        entryFromLeft:  { x: -18, y: -28 },
        entryFromRight: { x:  18, y: -28 },
        exitToLeft:     { x: -18, y:  28 },
        exitToRight:    { x:  18, y:  28 },
        flippable: false,
        selfAnimates: true,
    },
    {
        type: 'gearbit',
        label: 'Gear Bit',
        svgPath: '/src/assets/gearbit.svg',
        viewBoxWidth: 259,
        viewBoxHeight: 259,
        displayWidth: 95,
        centre: { x: 46, y: 45 },
        entryFromLeft:  { x: -22, y: -35 },
        entryFromRight: { x:  22, y: -35 },
        exitToLeft:     { x: -25, y:  32 },
        exitToRight:    { x:  25, y:  32 },
        flippable: false,
        selfAnimates: true,
    },
];

export function getConfig(type: string): PieceAnimConfig | undefined {
    return PIECE_CONFIGS.find(c => c.type === type);
}