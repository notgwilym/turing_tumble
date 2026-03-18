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
    scaleOverride?: number;
}

// ─── Sizing ──────────────────────────────────────────────────────────────────

const REFERENCE_CM_WIDTH = 31.7;
export const DEFAULT_GLOBAL_SCALE = 1.21;

export function getDisplayWidth(cfg: PieceAnimConfig, globalScale: number): number {
    return globalScale * (cfg.dimensions.cmWidth / REFERENCE_CM_WIDTH) * (cfg.scaleOverride ?? 1);
}

export function getDisplayHeight(cfg: PieceAnimConfig, globalScale: number): number {
    return globalScale * (cfg.dimensions.cmHeight / REFERENCE_CM_WIDTH) * (cfg.scaleOverride ?? 1);
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

export function getConfig(type: string): PieceAnimConfig | undefined {
    return PIECE_ANIM_CONFIGS.find(c => c.type === type);
}

// paste export from test page here:

// Auto-generated by AnimationTestPage
// Grid: 80px, Scale: 1.21

export const PIECE_ANIM_CONFIGS: PieceAnimConfig[] = [
  {
    "type": "bit",
    "label": "Bit",
    "svgPath": "/src/assets/bit.svg",
    "viewBoxWidth": 251,
    "viewBoxHeight": 251,
    "dimensions": {
      "cmWidth": 24.3,
      "cmHeight": 24.5
    },
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
    "flippable": true,
    "selfAnimates": true
  },
  {
    "type": "ramp",
    "label": "Ramp",
    "svgPath": "/src/assets/ramp.svg",
    "viewBoxWidth": 260,
    "viewBoxHeight": 180,
    "dimensions": {
      "cmWidth": 26.3,
      "cmHeight": 18.1
    },
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
    "flippable": true,
    "selfAnimates": true
  },
  {
    "type": "crossover",
    "label": "Crossover",
    "svgPath": "/src/assets/crossover.svg",
    "viewBoxWidth": 309,
    "viewBoxHeight": 276,
    "dimensions": {
      "cmWidth": 31.7,
      "cmHeight": 28.2
    },
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
    "flippable": false,
    "selfAnimates": false
  },
  {
    "type": "interceptor",
    "label": "Interceptor",
    "svgPath": "/src/assets/interceptor.svg",
    "viewBoxWidth": 275,
    "viewBoxHeight": 171,
    "dimensions": {
      "cmWidth": 22.2,
      "cmHeight": 15.4
    },
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
    "flippable": false,
    "selfAnimates": false
  },
  {
    "type": "gear",
    "label": "Gear",
    "svgPath": "/src/assets/gear.svg",
    "viewBoxWidth": 248,
    "viewBoxHeight": 249,
    "dimensions": {
      "cmWidth": 25.8,
      "cmHeight": 26.4
    },
    "centre": {
      "x": 0.5,
      "y": 0.48
    },
    "entryFromLeft": {
      "x": 0,
      "y": 0
    },
    "entryFromRight": {
      "x": 0,
      "y": 0
    },
    "exitToLeft": {
      "x": 0,
      "y": 0
    },
    "exitToRight": {
      "x": 0,
      "y": 0
    },
    "flippable": false,
    "selfAnimates": true
  },
  {
    "type": "gearbit",
    "label": "Gear Bit",
    "svgPath": "/src/assets/gearbit.svg",
    "viewBoxWidth": 259,
    "viewBoxHeight": 259,
    "dimensions": {
      "cmWidth": 26.9,
      "cmHeight": 27.6
    },
    "centre": {
      "x": 0.48,
      "y": 0.48
    },
    "entryFromLeft": {
      "x": -0.3,
      "y": -0.48
    },
    "entryFromRight": {
      "x": 0.39,
      "y": -0.44
    },
    "exitToLeft": {
      "x": -0.42,
      "y": 0.38
    },
    "exitToRight": {
      "x": 0.42,
      "y": 0.38
    },
    "flippable": true,
    "selfAnimates": true
  }
];

export const ANIM_PATHS = [
  {
    "key": "ANIM_crossover_left",
    "mode": "piece",
    "pathD": "M -0.3 -0.47 C -0.20767087627959285 -0.451399939570954 -0.1830407710979003 -0.375830395810253 -0.1487972702008657 -0.27943095981468435 C -0.14485735392408655 -0.26830899385638063 -0.13742779751644554 -0.19208681639641428 -0.13846343265205613 -0.1920596233256116 C -0.14413691209061802 -0.19189646490079554 -0.15557392619692523 -0.19059119750226594 -0.1604143947655398 -0.1896666330949744 C -0.17660182221127813 -0.18656662302346638 -0.18700320118197475 -0.17963238996877823 -0.20170471734618528 -0.17084902809950636 C -0.2542519435747701 -0.1394954174639943 -0.2836549759031901 -0.0649592103937956 -0.3067991698033559 -0.0010283009366498508 C -0.30682168361065126 -0.0009739147950444949 -0.18103704224856615 0.019393695236177177 -0.11133429486051949 0.08454829287944454 C -0.04030323284201659 0.15092657870883286 -0.02535406479755109 0.26211904522107 -0.024836247229745756 0.26127606002618586 C -0.020536110036232902 0.2545865646087224 0.010758082105041478 0.21181186423607656 0.04245752277764131 0.21303555242219807 C 0.07636331656523748 0.21434081982072717 0.11074190030604725 0.2599435995568542 0.11267808773349325 0.26127606002618586 C 0.1128581981918601 0.26138483230939713 0.12776233862173286 0.23522509819720028 0.14291413093186062 0.23522509819720028 C 0.1559946529707672 0.23522509819720028 0.1685123298272767 0.25300936650216543 0.17074119674956945 0.25697955483935964 C 0.17312766032293264 0.26127606002618586 0.1926471312484614 0.2564628864941082 0.20176522320329243 0.25697955483935964 C 0.24100678932001313 0.2591821935743781 0.25870264185457453 0.25684358948534625 0.2827473880465758 0.27092960016114453 C 0.30282970415450156 0.28273139288951576 0.32102086044957295 0.3069060328331157 0.33432652056143813 0.32980259844898796 C 0.3363302494107712 0.3332561184409306 0.33824392303092193 0.336655252291268 0.34 0.3400000000000001",
    "events": [],
    "speed": [
      {
        "t": 0,
        "l": 0
      },
      {
        "t": 0.5947897162609822,
        "l": 0.7084418968212611
      },
      {
        "t": 1,
        "l": 1
      }
    ],
    "duration": 1000
  },
  {
    "key": "ANIM_ramp_left",
    "mode": "piece",
    "pathD": "M -0.41 -0.79 C -0.36807514925979784 -0.77416399707216 -0.1913037312691373 -0.7175060125288744 -0.1450988592125585 -0.7022988298145385 C -0.05543152114024552 -0.6727827789765869 0.19504439406393098 -0.5923451239103776 0.22128828592848176 -0.5817065125431334 C 0.22208638551931553 -0.5813856859035904 0.22251090657826983 -0.5791783986235349 0.2240986153387587 -0.57794642432769 C 0.4977363995194783 -0.36690666083633544 0.5186228356200264 0.036500755724973355 0.40391724549059266 0.3407342414707648 C 0.4031700884268334 0.34269770050476733 0.403441781904564 0.3441350038499198 0.403552157379892 0.34419916917782856 C 0.4120425785589767 0.35006388014867396 0.474336798749921 0.36478340637090434 0.5125436940558019 0.44470773881384495 C 0.5125776557405184 0.44478473720733525 0.5125521844769809 0.44502856545338787 0.5126795407946672 0.44525956063385874 C 0.5293717088327474 0.4768160688993037 0.53 0.5415203855623265 0.53 0.56",
    "events": [
      {
        "at": 0.3701029814201354,
        "event": "startTilt"
      },
      {
        "at": 0.99,
        "event": "startReset"
      }
    ],
    "speed": [
      {
        "t": 0,
        "l": 0
      },
      {
        "t": 0.36542200777761774,
        "l": 0.4218342886920271
      },
      {
        "t": 0.7118140573239233,
        "l": 0.7800937988535696
      },
      {
        "t": 1,
        "l": 1
      }
    ],
    "duration": 1000
  }
];
