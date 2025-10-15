import type { Ball } from "../Ball";

export interface Piece {
    x: number
    y: number;

    handleBall(ball: Ball): void;
}

export interface FlippablePiece extends Piece {
    orientation: 'left' | 'right';
}