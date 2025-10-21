import { Piece } from "./Piece";
import type { Ball } from "../Ball";

export class Crossover extends Piece {
    constructor(x: number, y: number) {
        super(x, y);
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
            // raise error
            throw new Error("Ball approached crossover from invalid direction");
        }
    }
}
