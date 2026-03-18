/**
 * PieceAnimState.ts
 *
 * Framework-agnostic piece animation definitions.
 * Consumed by both AnimationTestPage (SVG) and PieceSprite (HTML).
 *
 * The model: every piece animation is a rotation around the peg hole.
 * Events from path playback trigger transitions to target rotation values.
 * CSS/SVG transitions handle the interpolation — no frame-by-frame needed.
 */

import type { PathEvent } from './PieceAnimConfig';

// ─── Event Definitions ───────────────────────────────────────────────────────

export interface PieceEventDef {
    /** Target rotation in degrees (added to base engine rotation) */
    rotation: number;
    /** Transition duration in ms */
    durationMs: number;
    /** CSS easing function */
    easing: string;
}

/**
 * Per piece type: what each event does visually.
 * 
 * 'rotation' is the animRotation offset — it's ADDED to the piece's
 * base engine rotation (from orientation/gear state).
 * 
 * For 'startFlip' on bit: the bit arm swings 90° from current position.
 * For 'startTilt' on ramp: tilts slightly on ball contact.
 * For 'startReset': returns to 0° offset (rest position).
 * For 'startRotate' on gear/gearbit: turns 90°.
 */
export const PIECE_EVENT_DEFS: Record<string, Record<string, PieceEventDef>> = {
    bit: {
        startFlip: { rotation: 90, durationMs: 150, easing: 'ease-out' },
    },
    ramp: {
        startTilt:  { rotation: 90, durationMs: 600, easing: 'ease-out' },
        startReset: { rotation: 0,  durationMs: 400, easing: 'ease-in-out' },
    },
    crossover: {},
    interceptor: {},
    gear: {
        startRotate: { rotation: 90, durationMs: 150, easing: 'ease-out' },
    },
    gearbit: {
        startRotate: { rotation: 90, durationMs: 150, easing: 'ease-out' },
    },
};

// ─── Available Events Per Piece ──────────────────────────────────────────────

/** Get the event types that are valid for a given piece type */
export function getAvailableEvents(pieceType: string): string[] {
    const defs = PIECE_EVENT_DEFS[pieceType];
    return defs ? Object.keys(defs) : [];
}

/** Get the default events for a piece type (typical timing) */
export function getDefaultEvents(pieceType: string): PathEvent[] {
    switch (pieceType) {
        case 'bit':
            return [{ at: 0.35, event: 'startFlip' }];
        case 'ramp':
            return [
                { at: 0.2, event: 'startTilt' },
                { at: 0.9, event: 'startReset' },
            ];
        case 'gearbit':
            return [{ at: 0.35, event: 'startRotate' }];
        default:
            return [];
    }
}

// ─── Runtime State ───────────────────────────────────────────────────────────

export interface PieceAnimRuntime {
    /** Current visual rotation offset (degrees), on top of engine base state */
    animRotation: number;
    /** CSS transition string for smooth animation */
    transition: string;
    /** Which events have already fired (by index) */
    firedEvents: Set<number>;
}

export function createPieceAnimRuntime(): PieceAnimRuntime {
    return {
        animRotation: 0,
        transition: 'none',
        firedEvents: new Set(),
    };
}

/**
 * Check if any events should fire at the given length fraction.
 * Mutates runtime.firedEvents and returns the new animRotation + transition if changed.
 */
export function processEvents(
    runtime: PieceAnimRuntime,
    events: PathEvent[],
    pieceType: string,
    lengthFraction: number,
    flipped: boolean = false,
): { changed: boolean; animRotation: number; transition: string } {
    const defs = PIECE_EVENT_DEFS[pieceType] ?? {};
    let changed = false;
    let animRotation = runtime.animRotation;
    let transition = runtime.transition;

    for (let i = 0; i < events.length; i++) {
        if (lengthFraction >= events[i].at && !runtime.firedEvents.has(i)) {
            runtime.firedEvents.add(i);
            const def = defs[events[i].event];
            if (def) {
                animRotation = flipped ? -def.rotation : def.rotation;
                transition = `transform ${def.durationMs}ms ${def.easing}`;
                changed = true;
            }
        }
    }

    if (changed) {
        runtime.animRotation = animRotation;
        runtime.transition = transition;
    }

    return { changed, animRotation, transition };
}

/** Reset runtime for replay */
export function resetPieceAnimRuntime(runtime: PieceAnimRuntime): void {
    runtime.animRotation = 0;
    runtime.transition = 'none';
    runtime.firedEvents = new Set();
}