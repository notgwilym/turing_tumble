import { Board } from "./Board";
import { Ramp } from "./pieces/Ramp";
import { Orientation } from "./pieces/Piece";
import { Crossover } from "./pieces/Crossover";

export class Engine {
  private board: Board;
  constructor() {
    this.board = new Board();
  }

}