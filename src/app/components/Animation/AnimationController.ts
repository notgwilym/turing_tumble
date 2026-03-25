/**
 * AnimationController.ts
 *
 * Framework-agnostic class that drives board animation from pre-computed TickDeltas.
 *
 * Usage:
 *   const ctrl = new AnimationController(deltas, pieces, gridSize, globalScale, () => svelteTick());
 *   ctrl.play();
 *   // Each frame: read ctrl.ballPos, ctrl.ballColour, ctrl.pieceAnimStates
 *   // On cleanup: ctrl.dispose()
 *
 * Coordinate conventions (from PieceAnimConfig):
 *   - Piece paths are in piece-fraction coords → multiply by displayWidthPx/heightPx
 *   - Transition paths are in grid-fraction coords → multiply by gridSize
 *   - World position = cellCentreX/Y + offset
 */

import {
    ANIM_PATHS,
    PIECE_ANIM_CONFIGS,
    getDisplayWidthPx,
    getDisplayHeightPx,
    getExitPoint,
    getEntryPoint,
    pointToPx,
    type SpeedKeyframe,
    type PathEvent,
} from './PieceAnimConfig';
import type { TickDelta } from '../../../engine/TickDelta';
import type { Piece } from '../../../engine/pieces/Piece';
import { parsePath, serializePath, mirrorPathX } from './svgPathUtils';

// ─── Saved path shape (mirrors AnimationTestPage's internal format) ───────────

interface SavedPath {
    key: string;
    mode: 'piece' | 'transition';
    d: string;
    events: PathEvent[];
    speed: SpeedKeyframe[];
    duration: number;
}

// ─── Output types ─────────────────────────────────────────────────────────────

export interface AnimBallState {
    x: number;    // world-space pixel X (centred on ball)
    y: number;    // world-space pixel Y
    colour: 'red' | 'blue';
}

export interface AnimPieceState {
    /** Absolute rotation in degrees (0 or 90, transitioning between) */
    rotation: number;
    /** CSS transition string, e.g. "transform 400ms ease-in" */
    transition: string;
}

// ─── AnimationController ──────────────────────────────────────────────────────

export class AnimationController {
    // ── Outputs (read by Svelte each frame via onUpdate callback) ─────────────
    ballPos: AnimBallState | null = null;
    /** key: "col,row" */
    pieceAnimStates: Map<string, AnimPieceState> = new Map();
    isPlaying = false;
    isComplete = false;

    get currentTick(): number {
        const idx = Math.min(this.tickIdx, this.deltas.length - 1);
        return idx >= 0 ? this.deltas[idx].tick : 0;
    }

    // ── Internal playback state ───────────────────────────────────────────────
    private deltas: TickDelta[];
    private gridSize: number;
    private globalScale: number;
    private onUpdate: () => void;

    private tickIdx = 0;
    private segment: 'anim' | 'trans' = 'anim';
    private segmentProgress = 0; // 0→1

    // CSS transition state per segment
    private animDuration = 1000;
    private transDuration = 100;

    // Cached anim key for the current segment — resolved once at segment start so that
    // mid-segment virtual-rotation changes (startFlip) don't switch the ball path.
    private currentAnimKey = '';
    private currentMirrorAnim = false;

    /** Absolute rotation (deg) for each piece keyed "col,row". Persists across ticks. */
    private virtualRotations: Map<string, number> = new Map();

    private rafId = 0;
    private lastTimestamp = 0;

    // ── Offscreen SVG path sampler ────────────────────────────────────────────
    private offscreenSvg: SVGSVGElement;
    private offscreenPath: SVGPathElement;

    // ── Mirror cache (same logic as AnimationTestPage) ────────────────────────
    private mirrorCache = new Map<string, SavedPath>();

    // ── Pre-parsed ANIM_PATHS ─────────────────────────────────────────────────
    private savedPaths: SavedPath[] = (ANIM_PATHS ?? []).map((p: any) => ({
        key: p.key,
        mode: (p.key.startsWith('TRANS_') ? 'transition' : 'piece') as 'piece' | 'transition',
        d: p.pathD ?? '',
        events: p.events ?? [],
        speed: p.speed ?? [{ t: 0, l: 0 }, { t: 1, l: 1 }],
        duration: p.duration ?? 1000,
    }));

    constructor(
        deltas: TickDelta[],
        initialPieces: (Piece | null)[][],
        gridSize: number,
        globalScale: number,
        onUpdate: () => void,
    ) {
        this.deltas = deltas;
        this.gridSize = gridSize;
        this.globalScale = globalScale;
        this.onUpdate = onUpdate;

        // Offscreen SVG for getPointAtLength
        this.offscreenSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        this.offscreenPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        this.offscreenSvg.appendChild(this.offscreenPath);
        this.offscreenSvg.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;pointer-events:none;';
        document.body.appendChild(this.offscreenSvg);

        // Initialise virtual rotations from initial piece states
        this._initVirtualRotations(initialPieces);

        // Set initial pieceAnimStates
        this._syncPieceAnimStates();
    }

    // ─── Public controls ──────────────────────────────────────────────────────

    play() {
        if (this.isComplete || this.isPlaying) return;
        this.isPlaying = true;
        this.lastTimestamp = performance.now();
        this.rafId = requestAnimationFrame(this._animate);
    }

    pause() {
        this.isPlaying = false;
        if (this.rafId) { cancelAnimationFrame(this.rafId); this.rafId = 0; }
        this.onUpdate();
    }

    stop() {
        this.pause();
        this.tickIdx = 0;
        this.segment = 'anim';
        this.segmentProgress = 0;
        this.isComplete = false;
        this.ballPos = null;
        this.onUpdate();
    }

    dispose() {
        this.pause();
        if (this.offscreenSvg.parentNode) {
            document.body.removeChild(this.offscreenSvg);
        }
    }

    // ─── Animation loop ───────────────────────────────────────────────────────

    private _animate = (timestamp: number) => {
        if (!this.isPlaying) return;

        const dt = timestamp - this.lastTimestamp;
        this.lastTimestamp = timestamp;

        this._advance(dt);
        this._updateBallPos();
        this._checkEvents();
        this.onUpdate();

        if (!this.isComplete) {
            this.rafId = requestAnimationFrame(this._animate);
        }
    };

    private _advance(dtMs: number) {
        if (this.tickIdx >= this.deltas.length) { this._complete(); return; }

        const delta = this.deltas[this.tickIdx];

        if (this.segment === 'anim') {
            this.segmentProgress += dtMs / this.animDuration;
            if (this.segmentProgress >= 1) {
                this.segmentProgress = 1;
                this._updateBallPos(); // final position
                this._checkEvents();   // ensure all events fire at 1.0

                // Apply piece changes to virtual rotations (piece settled)
                this._applyDeltaChanges(delta, false);

                if (delta.terminal) {
                    this._complete();
                    return;
                }

                if (!delta.nextPieceType) {
                    // Ball exited the board — hide it and advance to the next ball's tick
                    this.ballPos = null;
                    this.tickIdx += 1;
                    this.segment = 'anim';
                    this.segmentProgress = 0;
                    if (this.tickIdx >= this.deltas.length) {
                        this._complete();
                        return;
                    }
                    this._loadSegmentDurations(this.deltas[this.tickIdx]);
                    return;
                }

                // Normal case: transition to next piece
                this.segment = 'trans';
                this.segmentProgress = 0;
                this._loadSegmentDurations(delta);
            }
        } else {
            // transition segment
            this.segmentProgress += dtMs / this.transDuration;
            if (this.segmentProgress >= 1) {
                this.segmentProgress = 1;
                this._updateBallPos();

                // Move to next tick
                this.tickIdx += 1;
                this.segment = 'anim';
                this.segmentProgress = 0;

                if (this.tickIdx >= this.deltas.length) {
                    this._complete();
                    return;
                }
                this._loadSegmentDurations(this.deltas[this.tickIdx]);
            }
        }
    }

    private _loadSegmentDurations(delta: TickDelta) {
        const { animKey, mirrorAnim } = this._getAnimKey(delta);
        this.currentAnimKey = animKey;
        this.currentMirrorAnim = mirrorAnim;
        const animPath = this._findSavedPath(animKey, mirrorAnim);
        this.animDuration = animPath?.duration ?? 1000;

        if (delta.nextPieceType) {
            const transKey = `TRANS_${delta.pieceType}_${delta.exitDir}_${delta.nextPieceType}`;
            const transPath = this._findSavedPath(transKey, false);
            this.transDuration = transPath?.duration ?? 100;
        }
    }

    private _complete() {
        this.isPlaying = false;
        this.isComplete = true;
        this.ballPos = null;
        this.onUpdate();
    }

    // ─── Ball position ─────────────────────────────────────────────────────────

    private _updateBallPos() {
        if (this.tickIdx >= this.deltas.length) return;
        const delta = this.deltas[this.tickIdx];

        const cellCX = (delta.ball.from.col + 0.5) * this.gridSize;
        const cellCY = (delta.ball.from.row + 0.5) * this.gridSize;

        if (this.segment === 'anim') {
            const saved = this._findSavedPath(this.currentAnimKey, this.currentMirrorAnim);
            const kfs = saved?.speed ?? [{ t: 0, l: 0 }, { t: 1, l: 1 }];
            const lf = this._interpolateSpeed(kfs, Math.min(1, this.segmentProgress));

            if (saved?.d) {
                const cfg = PIECE_ANIM_CONFIGS.find(c => c.type === delta.pieceType);
                if (cfg) {
                    const dw = getDisplayWidthPx(cfg, this.globalScale, this.gridSize);
                    const dh = getDisplayHeightPx(cfg, this.globalScale, this.gridSize);
                    const pt = this._samplePath(saved.d, lf);
                    this.ballPos = { x: cellCX + pt.x * dw, y: cellCY + pt.y * dh, colour: delta.ball.colour };
                    return;
                }
            }
            // Linear fallback: entry to exit
            const cfg = PIECE_ANIM_CONFIGS.find(c => c.type === delta.pieceType);
            if (cfg) {
                const entry = pointToPx(cfg, getEntryPoint(cfg, delta.ball.entryDir), this.globalScale, this.gridSize);
                const exit = pointToPx(cfg, getExitPoint(cfg, delta.exitDir, delta.pieceFlipped), this.globalScale, this.gridSize);
                this.ballPos = {
                    x: cellCX + entry.x + (exit.x - entry.x) * lf,
                    y: cellCY + entry.y + (exit.y - entry.y) * lf,
                    colour: delta.ball.colour,
                };
            }

        } else {
            // Transition segment
            const cfg = PIECE_ANIM_CONFIGS.find(c => c.type === delta.pieceType);
            if (!cfg) return;

            const exitPt = pointToPx(cfg, getExitPoint(cfg, delta.exitDir, delta.pieceFlipped), this.globalScale, this.gridSize);
            const exitWorldX = cellCX + exitPt.x;
            const exitWorldY = cellCY + exitPt.y;

            const transKey = `TRANS_${delta.pieceType}_${delta.exitDir}_${delta.nextPieceType}`;
            const saved = this._findSavedPath(transKey, false);
            const kfs = saved?.speed ?? [{ t: 0, l: 0 }, { t: 1, l: 1 }];
            const lf = this._interpolateSpeed(kfs, Math.min(1, this.segmentProgress));

            if (saved?.d) {
                const pt = this._samplePath(saved.d, lf);
                this.ballPos = { x: exitWorldX + pt.x * this.gridSize, y: exitWorldY + pt.y * this.gridSize, colour: delta.ball.colour };
                return;
            }

            // Linear fallback: exit of from → entry of to
            const nextCellCX = (delta.ball.to.col + 0.5) * this.gridSize;
            const nextCellCY = (delta.ball.to.row + 0.5) * this.gridSize;
            const nextCfg = PIECE_ANIM_CONFIGS.find(c => c.type === delta.nextPieceType);
            if (nextCfg) {
                const nextEntryDir: 'left' | 'right' = delta.exitDir === 'right' ? 'left' : 'right';
                const entryPt = pointToPx(nextCfg, getEntryPoint(nextCfg, nextEntryDir), this.globalScale, this.gridSize);
                const entryWorldX = nextCellCX + entryPt.x;
                const entryWorldY = nextCellCY + entryPt.y;
                this.ballPos = {
                    x: exitWorldX + (entryWorldX - exitWorldX) * lf,
                    y: exitWorldY + (entryWorldY - exitWorldY) * lf,
                    colour: delta.ball.colour,
                };
            } else {
                this.ballPos = { x: exitWorldX, y: exitWorldY, colour: delta.ball.colour };
            }
        }
    }

    // ─── Events ───────────────────────────────────────────────────────────────

    /** Fired event indices for the current tick (reset at each new tick) */
    private firedEvents = new Set<number>();

    private _checkEvents() {
        if (this.segment !== 'anim' || this.tickIdx >= this.deltas.length) return;
        const delta = this.deltas[this.tickIdx];

        const saved = this._findSavedPath(this.currentAnimKey, this.currentMirrorAnim);
        if (!saved) return;

        const kfs = saved.speed;
        const lf = this._interpolateSpeed(kfs, Math.min(1, this.segmentProgress));

        for (let i = 0; i < saved.events.length; i++) {
            const evt = saved.events[i];
            if (lf >= evt.at && !this.firedEvents.has(i)) {
                this.firedEvents.add(i);
                this._fireEvent(delta, evt.event);
            }
        }
    }

    private _fireEvent(delta: TickDelta, eventName: string) {
        const key = `${delta.ball.from.col},${delta.ball.from.row}`;

        switch (eventName) {
            case 'startFlip': {
                // Bit flips: toggle 0↔90
                const cur = this.virtualRotations.get(key) ?? 0;
                const next = cur === 0 ? 90 : 0;
                this.virtualRotations.set(key, next);
                this.pieceAnimStates.set(key, { rotation: next, transition: 'transform 400ms ease-in' });
                break;
            }
            case 'startTilt': {
                // Ramp tilts
                this.virtualRotations.set(key, 90);
                this.pieceAnimStates.set(key, { rotation: 90, transition: 'transform 600ms ease-in' });
                break;
            }
            case 'startReset': {
                // Ramp resets
                this.virtualRotations.set(key, 0);
                this.pieceAnimStates.set(key, { rotation: 0, transition: 'transform 400ms ease-in' });
                break;
            }
            case 'startRotate': {
                // GearBit (and all gears in its set via delta.changes)
                for (const change of delta.changes) {
                    const gearKey = `${change.col},${change.row}`;
                    const cur = this.virtualRotations.get(gearKey) ?? 0;
                    const next = cur === 0 ? 90 : 0;
                    this.virtualRotations.set(gearKey, next);
                    this.pieceAnimStates.set(gearKey, { rotation: next, transition: 'transform 400ms ease-out' });
                }
                break;
            }
        }
    }

    /**
     * Apply the delta's changes to virtual rotations WITHOUT transition
     * (called when segment completes — state should already be at target from CSS transition).
     * This ensures virtual rotations stay accurate for future ticks even if events didn't fire.
     */
    private _applyDeltaChanges(delta: TickDelta, withTransition: boolean) {
        for (const change of delta.changes) {
            const gearKey = `${change.col},${change.row}`;
            // Derive absolute rotation from 'after' state
            // Bit orientation: Left(0)→90°, Right(1)→0°
            // Gear rotation: CW(0)→90°, CCW(1)→0°
            const rot = change.after === 0 ? 90 : 0;
            this.virtualRotations.set(gearKey, rot);
            if (!withTransition) {
                // State is already settled — just ensure map is current, no new transition
                const existing = this.pieceAnimStates.get(gearKey);
                this.pieceAnimStates.set(gearKey, {
                    rotation: rot,
                    transition: existing?.transition ?? 'none',
                });
            }
        }

        // Reset ramp tilt (ramp has no delta.changes but the tilt must reset)
        if (delta.pieceType === 'ramp') {
            const key = `${delta.ball.from.col},${delta.ball.from.row}`;
            this.virtualRotations.set(key, 0);
            const existing = this.pieceAnimStates.get(key);
            if (existing && existing.rotation !== 0) {
                this.pieceAnimStates.set(key, { rotation: 0, transition: 'transform 400ms ease-in' });
            }
        }

        // Reset fired-events tracker for next tick
        this.firedEvents = new Set();
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    /** Derive piece path key and whether path should be x-mirrored. */
    private _getAnimKey(delta: TickDelta): { animKey: string; mirrorAnim: boolean } {
        const { pieceType, pieceFlipped, ball } = delta;
        let entryDir = ball.entryDir;
        let mirror = false;

        if (pieceType === 'ramp' && pieceFlipped) {
            // Flipped ramp: swap entry dir AND mirror path
            entryDir = entryDir === 'left' ? 'right' : 'left';
            mirror = true;
        }

        // Crossover/Interceptor: right auto-mirrors from left inside _findSavedPath

        if (pieceType === 'bit' || pieceType === 'gearbit') {
            // When facing left (virtualRot=90°), authored paths are for the right-facing state.
            // Mirror the opposite-entry path, same as flipped ramps.
            const pieceKey = `${delta.ball.from.col},${delta.ball.from.row}`;
            const virtualRot = this.virtualRotations.get(pieceKey) ?? 0;
            if (virtualRot === 90) {
                entryDir = entryDir === 'left' ? 'right' : 'left';
                mirror = true;
            }
        }

        return { animKey: `ANIM_${pieceType}_${entryDir}`, mirrorAnim: mirror };
    }

    private _interpolateSpeed(kfs: SpeedKeyframe[], t: number): number {
        if (kfs.length < 2) return t;
        let lo = kfs[0], hi = kfs[kfs.length - 1];
        for (let i = 0; i < kfs.length - 1; i++) {
            if (t >= kfs[i].t && t <= kfs[i + 1].t) { lo = kfs[i]; hi = kfs[i + 1]; break; }
        }
        if (hi.t === lo.t) return lo.l;
        return lo.l + ((t - lo.t) / (hi.t - lo.t)) * (hi.l - lo.l);
    }

    private _samplePath(d: string, lengthFraction: number): { x: number; y: number } {
        this.offscreenPath.setAttribute('d', d);
        const total = this.offscreenPath.getTotalLength();
        const pt = this.offscreenPath.getPointAtLength(Math.max(0, lengthFraction) * total);
        return { x: pt.x, y: pt.y };
    }

    /** Find a saved path by key, applying auto-mirror rules (same as AnimationTestPage). */
    private _findSavedPath(key: string, flipped: boolean): SavedPath | undefined {
        let direct = this.savedPaths.find(p => p.key === key);

        // Auto-mirror crossover/interceptor right from left
        if (!direct && (key.includes('crossover') || key.includes('interceptor'))) {
            const mirroredKey = key.replace('_right', '_left');
            if (mirroredKey !== key) {
                const cached = this.mirrorCache.get(key);
                if (cached) { direct = cached; }
                else {
                    const src = this.savedPaths.find(p => p.key === mirroredKey);
                    if (src) {
                        if (src.d) {
                            const mirrored = serializePath(mirrorPathX(parsePath(src.d)));
                            const entry: SavedPath = { ...src, key, d: mirrored };
                            this.mirrorCache.set(key, entry);
                            direct = entry;
                        } else {
                            direct = { ...src, key };
                        }
                    }
                }
            }
        }

        // Auto-mirror transitions right↔left (except toGearBit)
        if (!direct && key.startsWith('TRANS_')) {
            const mirroredKey = key.includes('_right_')
                ? key.replace('_right_', '_left_')
                : key.replace('_left_', '_right_');
            if (mirroredKey !== key) {
                const toPiece = key.split('_').pop();
                const src = this.savedPaths.find(p => p.key === mirroredKey);
                if (src) {
                    if (!src.d || toPiece === 'gearbit') {
                        direct = { ...src, key };
                    } else {
                        const cached = this.mirrorCache.get(key);
                        if (cached) { direct = cached; }
                        else {
                            const mirrored = serializePath(mirrorPathX(parsePath(src.d)));
                            const entry: SavedPath = { ...src, key, d: mirrored };
                            this.mirrorCache.set(key, entry);
                            direct = entry;
                        }
                    }
                }
            }
        }

        if (!direct) return undefined;

        if (flipped && direct.d) {
            const flipKey = key + '_flipped';
            const cached = this.mirrorCache.get(flipKey);
            if (cached) return cached;
            const mirrored = serializePath(mirrorPathX(parsePath(direct.d)));
            const entry: SavedPath = { ...direct, key: flipKey, d: mirrored };
            this.mirrorCache.set(flipKey, entry);
            return entry;
        }

        return direct;
    }

    // ─── Initialise virtual rotations from piece grid ─────────────────────────

    private _initVirtualRotations(pieces: (Piece | null)[][]) {
        // Import inline to avoid circular dependencies
        // We just need orientation/rotation values from the pieces
        for (let row = 0; row < pieces.length; row++) {
            for (let col = 0; col < pieces[row].length; col++) {
                const piece = pieces[row][col];
                if (!piece) continue;
                const key = `${col},${row}`;
                // Check orientation (FlippablePiece: Bit, Ramp, GearBit not here)
                // Check rotation (Gear: GearBit, NormalGear)
                // We use duck-typing on the fields:
                let rot = 0;
                const name = piece.constructor.name;
                if (name === 'Ramp') {
                    rot = 0; // Ramp uses scaleX for orientation, never rotates
                } else if ('orientation' in piece) {
                    rot = (piece as any).orientation === 0 ? 90 : 0; // Left(0)→90°, Right(1)→0°
                } else if ('rotation' in piece) {
                    rot = (piece as any).rotation === 0 ? 90 : 0; // CW(0)→90°, CCW(1)→0°
                }
                this.virtualRotations.set(key, rot);
            }
        }
    }

    /** Write current virtualRotations → pieceAnimStates (no CSS transition) */
    private _syncPieceAnimStates() {
        for (const [key, rot] of this.virtualRotations) {
            this.pieceAnimStates.set(key, { rotation: rot, transition: 'none' });
        }
    }

    /** Called from outside: load the durations for tick 0 to prime the timing */
    public prime() {
        if (this.deltas.length > 0) {
            this._loadSegmentDurations(this.deltas[0]);
        }
    }
}
