import type { Piece } from "./Piece";
import type { Ball } from "../Ball";

export class Ramp implements Piece {
    x: number
    y: number;

    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
    }

    handleBall(ball: Ball): void {
        // move ball down and left or right based on balls previous position
        if (ball.prev_x < this.x) {
            ball.moveTo(this.x + 1, this.y + 1);
        }
        else if (ball.prev_x > this.x) {
            ball.moveTo(this.x - 1, this.y + 1);
        }
        else {
            // ball came from above, default to right
            ball.moveTo(this.x + 1, this.y + 1);
        }
    }
}
