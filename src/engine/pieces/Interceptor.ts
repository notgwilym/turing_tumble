import { Piece } from "./Piece";
import type { Ball } from "../Ball";

export class Interceptor extends Piece {
    constructor(x: number, y: number) {
        super(x, y);
    }

    handleBall(ball: Ball): void {
        // does nothing, intercepts ball
        return;
    }
}