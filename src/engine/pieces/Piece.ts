import type { Ball } from "../Ball";

export abstract class Piece {
  constructor(public x: number, public y: number) {}
  abstract handleBall(ball: Ball): void;
  clone(): this {
    return Object.assign(
      Object.create(Object.getPrototypeOf(this)),
      this
    );
  }
}

export enum Orientation {
  Left,
  Right,
}

export abstract class FlippablePiece extends Piece {
  constructor(x: number, y: number, public orientation: Orientation) {
    super(x, y);
  }

  flip() {
    this.orientation =
      this.orientation === Orientation.Left
        ? Orientation.Right
        : Orientation.Left;
  }
}