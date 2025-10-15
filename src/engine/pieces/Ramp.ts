import type { FlippablePiece } from "./Piece";

export class Ramp implements FlippablePiece {
    x: number
    y: number;

    orientation: 'left' | 'right';

    constructor(x: number, y: number, orientation: 'left' | 'right') {
        this.x = x;
        this.y = y;
        this.orientation = orientation;
    }

    handleBall(): void {
        // move ball down and left or right based on orientation
    }
}
