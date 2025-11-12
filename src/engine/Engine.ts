import { Board, CellType } from "./Board";
import { Ball } from "./Ball";
import { FlippablePiece, Piece } from "./pieces/Piece";
import { Interceptor } from "./pieces/Interceptor";

enum EngineState {
  INIT = 'INIT',
  SETUP = 'SETUP',
  RUNNING = 'RUNNING',
  FROZEN = 'FROZEN',
  FINISHED = 'FINISHED',
}

enum StateTransition {
  INIT_DONE = 'init_done',
  PLAY = 'play',
  PAUSE = 'pause',
  STOP = 'stop',
  STEP = 'step',
  TERMINAL_STATE = 'terminal_state',
}

type TransitionMap = {
  [key in EngineState]?: {
    [key in StateTransition]?: EngineState;
  };
};

const STATE_TRANSITIONS: TransitionMap = {
  [EngineState.INIT]: {
    [StateTransition.INIT_DONE]: EngineState.SETUP,
  },
  [EngineState.SETUP]: {
    [StateTransition.PLAY]: EngineState.RUNNING,
    [StateTransition.STEP]: EngineState.FROZEN,
  },
  [EngineState.RUNNING]: {
    [StateTransition.PAUSE]: EngineState.FROZEN,
    [StateTransition.STOP]: EngineState.SETUP,
    [StateTransition.TERMINAL_STATE]: EngineState.FINISHED,
  },
  [EngineState.FROZEN]: {
    [StateTransition.PLAY]: EngineState.RUNNING,
    [StateTransition.STOP]: EngineState.SETUP,
    [StateTransition.STEP]: EngineState.FROZEN,
    [StateTransition.TERMINAL_STATE]: EngineState.FINISHED,
  },
  [EngineState.FINISHED]: {
    [StateTransition.STOP]: EngineState.SETUP,
  },
};

export class Engine {
  private state: EngineState = EngineState.INIT;
  private currentTick: number = 0;

  private board: Board; // models grid and pieces

  // balls
  private leftStartQueue: Ball[] = [];
  private rightStartQueue: Ball[] = [];
  private activeBalls: Ball[] = [];
  private finishedBalls: Ball[] = [];

  // for event system
  private listeners = new Set<() => void>();

  constructor(redBallsAmount: number = 20, blueBallsAmount: number = 20) {
    this.board = new Board();
    this.leftStartQueue = this.populateStartQueue('red', redBallsAmount);
    this.rightStartQueue = this.populateStartQueue('blue', blueBallsAmount);
    this.transition(StateTransition.INIT_DONE);
  }

  // subscribe to engine state changes
  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    // return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    this.listeners.forEach(fn => fn());
  }

  public getCurrentTick(): number {
    return this.currentTick;
  }

  public getState(): EngineState {
    return this.state;
  }

  public getActiveBalls(): Ball[] {
    return [...this.activeBalls];
  }

  public getFinishedBalls(): Ball[] {
    return [...this.finishedBalls];
  }

  public getQueueCounts(): { left: number; right: number } {
    return {
      left: this.leftStartQueue.length,
      right: this.rightStartQueue.length,
    };
  }

  public getBoard(): Board {
    return this.board;
  }

  public addPiece (piece: Piece) {
    if (this.state !== EngineState.SETUP) {
      throw new Error("Can only add pieces in SETUP state");
    }
    this.board.placePiece(piece);
    this.notify();
  }

  // remove piece

  // play

  public step() {
    this.transition(StateTransition.STEP);
    // process one tick
    this.tick();
    this.notify();
  }

  // process game logic for one tick
  private tick() {
    if (this.state !== EngineState.RUNNING && this.state !== EngineState.FROZEN) {
      throw new Error("Can only process tick in RUNNING or FROZEN state");
    }

    if (this.currentTick === 0) {
      // introduce first ball
      this.dropBall(this.board.getStartSide());
      this.currentTick += 1;
      return;
    }

    if (this.activeBalls.length != 1 ) {
      throw new Error("No single active ball to process in tick.");
    }
    let currentBall = this.activeBalls[0];
    let ballAtCellType = this.board.getCellType(currentBall.x, currentBall.y);

    // if ball at a slotpeg, get the piece there and process interaction
    if (ballAtCellType === CellType.SlotPeg) {
      let pieceAtLocation = this.board.getPieceAt(currentBall.x, currentBall.y);
      if (pieceAtLocation === null) {
        throw new Error("No piece placed at slot where ball has reached.");
      }
      // sim terminates if ball hits interceptor
      if (pieceAtLocation instanceof Interceptor) {
        this.activeBalls.pop();
        this.transition(StateTransition.TERMINAL_STATE);
        return;
      }

      pieceAtLocation.handleBall(currentBall);
    }
    // else handle right and left exits
    else if (ballAtCellType === CellType.RightExit) {
      this.finishedBalls.push(this.activeBalls.pop()!);

      let newBall = this.dropBall('right');
      if (!newBall) {
        this.transition(StateTransition.TERMINAL_STATE);
      }
    }
    else if (ballAtCellType === CellType.LeftExit) {
      this.finishedBalls.push(this.activeBalls.pop()!);

      let newBall = this.dropBall('left');
      if (!newBall) {
        this.transition(StateTransition.TERMINAL_STATE);
      }
    }
    else {
      throw new Error("Ball is at invalid cell type.");
    }

    this.currentTick += 1;
  }

  public getStateString(): string {
    let state = "";
    // current state
    state += `Current State: ${this.state}\n`;
    // current tick
    state += `Current Tick: ${this.currentTick}\n`;
    // left start queue
    state += `Left Start Queue: [${this.leftStartQueue.length}]\n`;
    // right start queue
    state += `Right Start Queue: [${this.rightStartQueue.length}]\n`;
    // board
    state += `Board: \n`;
    
    for (let y = 0; y < this.board.getGrid().length; y++) {
      let row = "";
      for (let x = 0; x < this.board.getGrid()[y].length; x++) {
        const cellType = this.board.getGrid()[y][x];
        const piece = this.board.getPieceAt(x, y);
        if (cellType === CellType.Blank) {
          row += "[   ] ";
        } else if (cellType === CellType.Peg) {
          row += "[ . ] ";
        }
        else if (cellType === CellType.SlotPeg) {
          if (piece) {
            row += `[${piece.constructor.name.charAt(0)}`;
            if (piece instanceof FlippablePiece) {
              row += piece.orientation === 0 ? "<" : ">";
            } else {
              row += " ";
            }
            if (this.activeBalls.length == 1 && this.activeBalls[0].x === x && this.activeBalls[0].y === y) {
              row += `${this.activeBalls[0].colour.charAt(0)}] `;
            } else {
              row += ` ] `;
            }
          } else {
            row += "[ _ ] ";
          }
        }
        else if (cellType === CellType.LeftExit) {
          if (this.activeBalls.length == 1 && this.activeBalls[0].x === x && this.activeBalls[0].y === y) {
              row += `[<-${this.activeBalls[0].colour.charAt(0)}] `;
            } else {
              row += "[<- ] ";
            }
        }
        else if (cellType === CellType.RightExit) {
          if (this.activeBalls.length == 1 && this.activeBalls[0].x === x && this.activeBalls[0].y === y) {
            row += `[->${this.activeBalls[0].colour.charAt(0)}] `;
          } else {
            row += "[-> ] ";
          }
        }
      }
      state += row + "\n";
    }

    state += `Finished Balls: [${this.finishedBalls.map(b => b.colour).join(", ")}]\n`;
    
    return state;
  }

  private dropBall(side : 'left' | 'right'): Ball | undefined {
    let nextBall: Ball | undefined;
    if (side === 'left') {
      nextBall = this.leftStartQueue.pop();
      if (nextBall) {
        nextBall.moveTo(this.board.getLeftEntryX(), 0);
      }
    }
    else {
      nextBall = this.rightStartQueue.pop();
      if (nextBall) {
        nextBall.moveTo(this.board.getRightEntryX(), 0);
      }
    }
    
    if (nextBall) {
      this.activeBalls.push(nextBall);
    }

    return nextBall;
  }

  private populateStartQueue(colour: 'red' | 'blue', count: number): Ball[] {
    const queue: Ball[] = [];
    for (let i = 0; i < count; i++) {
      queue.push(new Ball(colour));
    }
    return queue;
  }

  private transition(transition: StateTransition) {
    const transitions = STATE_TRANSITIONS[this.state];
    
    if (!transitions || !(transition in transitions)) {
      console.warn(`FAILED: Invalid transition '${transition}' from state ${this.state}'`);
      return false;
    }

    this.state = transitions[transition]!;
    console.log(`SUCCESS: Transitioned to state '${this.state}' via '${transition}'`);
  }

}