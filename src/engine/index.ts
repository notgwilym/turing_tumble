import { Board } from "./Board";

export class Engine {
  private board: Board;
  constructor() {
    this.board = new Board();
  }

  printState(): void {
    console.log("Current Engine State:");
    console.log(this.state);
  }

  get state() {
    return { board: this.board };
  }
}