/**
 * TickDelta.ts
 *
 * Describes one ball-visits-piece step in a pre-computed simulation.
 * Produced by Engine.runToCompletion() and consumed by AnimationController.
 */

export interface PieceChange {
    col: number;
    row: number;
    type: string; // 'bit' | 'ramp' | 'gearbit' | 'gear' | ...
    event: 'flip' | 'rotate';
    /** State before ball visit: Orientation value (0=Right,1=Left) or GearRotation value (0=CW,1=CCW) */
    before: number;
    /** State after ball visit */
    after: number;
}

export interface TickDelta {
    tick: number;

    ball: {
        colour: 'red' | 'blue';
        /** Cell where the ball is (and where the piece lives) */
        from: { col: number; row: number };
        /** Cell the ball moves to after visiting the piece */
        to: { col: number; row: number };
        /** Direction the ball entered the piece from */
        entryDir: 'left' | 'right';
    };

    /** Piece type at `from` cell (e.g. 'bit', 'ramp', 'crossover') */
    pieceType: string;
    /** True if Ramp is in orientation.Left (flipped) — affects path key and mirroring */
    pieceFlipped: boolean;
    /** Direction the ball exited (derived from to.col vs from.col) */
    exitDir: 'left' | 'right';

    /** Type of piece at `to` cell (for transition path key lookup); null if exiting board */
    nextPieceType: string | null;

    /** All state changes that occurred this tick (includes gear-set cascade) */
    changes: PieceChange[];

    terminal: boolean;
    terminalReason?: 'interceptor' | 'no_balls';
}
