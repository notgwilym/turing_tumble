import { FlippablePiece } from "./Piece";
import { Orientation } from "./Piece";
import type { Ball } from "../Ball";

export class Ramp extends FlippablePiece {

    constructor(x: number, y: number, orientation: Orientation) {
        super(x, y, orientation);
    }

    handleBall(ball : Ball): void {
        // move ball down and left or right based on orientation
        if (this.orientation === Orientation.Left) {
            ball.moveTo(this.x - 1, this.y + 1);
        }
        else {
            ball.moveTo(this.x + 1, this.y + 1);
        }
    }
}
