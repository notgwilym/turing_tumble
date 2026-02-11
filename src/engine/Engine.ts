import { Board, CellType } from "./Board";
import { Ball } from "./Ball";
import { FlippablePiece, Piece } from "./pieces/Piece";
import { Interceptor } from "./pieces/Interceptor";
import { Gear, GearBit, NormalGear, GearRotation } from "./pieces/Gear";

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
    [StateTransition.TERMINAL_STATE]: EngineState.FINISHED,
  },
  [EngineState.FINISHED]: {
    [StateTransition.STOP]: EngineState.SETUP,
  },
};

export class Engine {
  private state: EngineState = EngineState.INIT;
  private currentTick: number = 0;

  private board: Board;

  private leftStartQueue: Ball[] = [];
  private rightStartQueue: Ball[] = [];
  private activeBalls: Ball[] = [];
  private finishedBalls: Ball[] = [];

  private listeners = new Set<() => void>();

  constructor(redBallsAmount: number = 20, blueBallsAmount: number = 20) {
    this.board = new Board();
    this.leftStartQueue = this.populateStartQueue('red', redBallsAmount);
    this.rightStartQueue = this.populateStartQueue('blue', blueBallsAmount);
    this.transition(StateTransition.INIT_DONE);
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  private notify(): void {
    this.listeners.forEach(fn => fn());
  }

  public getCurrentTick(): number { return this.currentTick; }
  public getState(): EngineState { return this.state; }
  public getActiveBalls(): Ball[] { return [...this.activeBalls]; }
  public getFinishedBalls(): Ball[] { return [...this.finishedBalls]; }
  public getQueueCounts(): { left: number; right: number } {
    return { left: this.leftStartQueue.length, right: this.rightStartQueue.length };
  }
  public getBoard(): Board { return this.board; }

  public addPiece(piece: Piece) {
    if (this.state !== EngineState.SETUP) {
      throw new Error("Can only add pieces in SETUP state");
    }
    this.board.placePiece(piece);
    this.notify();
  }

  public removePiece(x: number, y: number) {
    if (this.state !== EngineState.SETUP) {
      throw new Error("Can only remove pieces in SETUP state");
    }
    this.board.removePiece(x, y);
    this.notify();
  }

  // ─── Toggle / rotate a piece in place ──────────────────────────────────────
  //
  // Handles two distinct cases that share the same user gesture (click):
  //
  // • FlippablePiece (Bit, Ramp): no gear-set involvement, so we can safely
  //   remove → clone → flip → re-add.  The engine's normal placement validation
  //   still runs, which is desirable.
  //
  // • GearBit: must NOT use remove/re-add because GearSetManager.addGear()
  //   reconstructs set membership from scratch via adjacency, which would
  //   cascade incorrect rotation changes to every other gear in the chain.
  //   Instead we call gearSetManager.turnGear() which atomically turns the
  //   entire set exactly one step, preserving all set memberships.
  //
  // • NormalGear: rotation is fully determined by adjacency rules when placed.
  //   There is no meaningful user-toggled state — no-op.
  //
  // • Crossover / Interceptor: no orientation state — no-op.

  public togglePiece(x: number, y: number): void {
    if (this.state !== EngineState.SETUP) {
      throw new Error("Can only toggle pieces in SETUP state");
    }

    const piece = this.board.getPieceAt(x, y);
    if (!piece) return;

    if (piece instanceof FlippablePiece) {
      // Standard flip: remove, clone with flipped orientation, re-place.
      const flipped = piece.clone() as FlippablePiece;
      flipped.flip();
      this.board.removePiece(x, y);
      this.board.placePiece(flipped);
      this.notify();
      return;
    }

    if (piece instanceof GearBit) {
      // Turn the entire gear set this GearBit belongs to atomically.
      this.board.getGearSetManager().turnGear(piece);
      this.notify();
      return;
    }

    // NormalGear, Crossover, Interceptor — no togglable state.
  }

  public step() {
    this.transition(StateTransition.STEP);
    this.tick();
    this.notify();
  }

  private tick() {
    if (this.state !== EngineState.RUNNING && this.state !== EngineState.FROZEN) {
      throw new Error("Can only process tick in RUNNING or FROZEN state");
    }

    if (this.currentTick === 0) {
      this.dropBall(this.board.getStartSide());
      this.currentTick += 1;
      return;
    }

    let currentBall = this.activeBalls[0];
    let ballAtCellType = this.board.getCellType(currentBall.x, currentBall.y);

    if (ballAtCellType === CellType.SlotPeg) {
      let pieceAtLocation = this.board.getPieceAt(currentBall.x, currentBall.y);
      if (pieceAtLocation === null) {
        throw new Error("No piece placed at slot where ball has reached.");
      }
      if (pieceAtLocation instanceof Interceptor) {
        this.transition(StateTransition.TERMINAL_STATE);
        return;
      }
      pieceAtLocation.handleBall(currentBall);
      if (pieceAtLocation instanceof GearBit) {
        this.board.getGearSetManager().turnGear(pieceAtLocation as Gear);
      }
    }
    else if (ballAtCellType === CellType.RightExit) {
      this.finishedBalls.push(this.activeBalls.pop()!);
      if (!this.dropBall('right')) this.transition(StateTransition.TERMINAL_STATE);
    }
    else if (ballAtCellType === CellType.LeftExit) {
      this.finishedBalls.push(this.activeBalls.pop()!);
      if (!this.dropBall('left')) this.transition(StateTransition.TERMINAL_STATE);
    }
    else {
      throw new Error("Ball is at invalid cell type.");
    }

    this.currentTick += 1;
  }

  public getStateString(): string {
    let state = "";
    state += `Current State: ${this.state}\n`;
    state += `Current Tick: ${this.currentTick}\n`;
    state += `Left Start Queue: [${this.leftStartQueue.length}]\n`;
    state += `Right Start Queue: [${this.rightStartQueue.length}]\n`;
    state += `Board: \n`;
    
    for (let y = 0; y < this.board.getGrid().length; y++) {
      let row = "";
      for (let x = 0; x < this.board.getGrid()[y].length; x++) {
        const cellType = this.board.getGrid()[y][x];
        const piece = this.board.getPieceAt(x, y);
        if (cellType === CellType.Blank) {
          row += "[   ] ";
        } else if (cellType === CellType.Peg) {
          if (piece instanceof Gear) {
            row += `[${piece.rotation === GearRotation.Clockwise ? "G" : "g"}  ] `;
          } else {
            row += "[ . ] ";
          }
        }
        else if (cellType === CellType.SlotPeg) {
          if (piece) {
            if (piece instanceof Gear) {
              row += `[${piece.rotation === GearRotation.Clockwise ? "G" : "g"}`;
            } else {
              row += `[${piece.constructor.name.charAt(0)}`;
            }
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
    state += 'Gear Sets on Board: \n';
    const gearSets = this.board.getGearSetManager().getAllSets();
    gearSets.forEach((set, index) => {
      state += `  Gear Set ${index + 1}: ${Array.from(set.values()).map(g => `(${g.x},${g.y})`).join(", ")}\n`;
    });

    return state;
  }

  private dropBall(side: 'left' | 'right'): Ball | undefined {
    let nextBall: Ball | undefined;
    if (side === 'left') {
      nextBall = this.leftStartQueue.pop();
      if (nextBall) nextBall.moveTo(this.board.getLeftEntryX(), 0);
    } else {
      nextBall = this.rightStartQueue.pop();
      if (nextBall) nextBall.moveTo(this.board.getRightEntryX(), 0);
    }
    if (nextBall) this.activeBalls.push(nextBall);
    return nextBall;
  }

  private populateStartQueue(colour: 'red' | 'blue', count: number): Ball[] {
    const queue: Ball[] = [];
    for (let i = 0; i < count; i++) queue.push(new Ball(colour));
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