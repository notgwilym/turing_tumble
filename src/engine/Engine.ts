import { Board, CellType } from "./Board";
import { Ball } from "./Ball";
import { FlippablePiece, Orientation, Piece } from "./pieces/Piece";
import { Interceptor } from "./pieces/Interceptor";
import { Gear, GearBit, NormalGear, GearRotation } from "./pieces/Gear";
import { Ramp } from "./pieces/Ramp";
import { Bit } from "./pieces/Bit";
import type { TickDelta, PieceChange } from "./TickDelta";

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
    [StateTransition.STEP]: EngineState.FROZEN,
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

  // ─── Pre-compute simulation ───────────────────────────────────────────────
  //
  // Clones the current board configuration into a temporary Engine, runs it
  // to completion, and returns a TickDelta for every ball-visits-piece step.
  // The real engine state is never mutated.

  public reset(pieces?: (Piece | null)[][]): void {
    this.state = EngineState.SETUP;
    this.currentTick = 0;
    this.leftStartQueue = this.populateStartQueue('red', 20);
    this.rightStartQueue = this.populateStartQueue('blue', 20);
    this.activeBalls = [];
    this.finishedBalls = [];
    if (pieces) {
      this.board = new Board();
      for (const row of pieces) {
        for (const piece of row) {
          if (piece) {
            try { this.board.placePiece(piece.clone()); } catch { /* ignore */ }
          }
        }
      }
    }
    this.notify();
  }

  public runToCompletion(): TickDelta[] {
    if (this.state !== EngineState.SETUP) {
      throw new Error("runToCompletion can only be called in SETUP state");
    }

    const counts = this.getQueueCounts();
    const sim = new Engine(counts.left, counts.right);

    // Copy all pieces from current board into the simulation engine
    const pieceGrid = this.board.getPieceGrid();
    for (let y = 0; y < pieceGrid.length; y++) {
      for (let x = 0; x < pieceGrid[y].length; x++) {
        const piece = pieceGrid[y][x];
        if (piece !== null) {
          try { sim.addPiece(piece.clone()); } catch { /* ignore placement errors */ }
        }
      }
    }

    return sim._simulateAndCollect();
  }

  /** Run the simulation on this engine instance, collecting TickDeltas. */
  private _simulateAndCollect(): TickDelta[] {
    const deltas: TickDelta[] = [];

    // Transition to RUNNING and drop the first ball (tick 0)
    this.transition(StateTransition.PLAY);
    this.tick(); // sets currentTick=1, active ball placed at entry cell

    const MAX_STEPS = 20000;
    for (let guard = 0; guard < MAX_STEPS; guard++) {
      if (this.getState() === EngineState.FINISHED) break;
      if (this.activeBalls.length === 0) break;

      const ball = this.activeBalls[0];
      const cellType = this.board.getCellType(ball.x, ball.y);

      // Exit cells: consume the tick, drop next ball (or terminal). No delta.
      if (cellType === CellType.RightExit || cellType === CellType.LeftExit) {
        this.tick();
        continue;
      }

      if (cellType !== CellType.SlotPeg) break; // shouldn't happen

      const piece = this.board.getPieceAt(ball.x, ball.y);
      if (!piece) break;

      const fromCol = ball.x;
      const fromRow = ball.y;
      const colour = ball.colour;
      const prevX = ball.prev_x;
      const tickNum = this.currentTick;

      const entryDir: 'left' | 'right' = prevX < piece.x ? 'left' : 'right';
      const pieceType = this._pieceTypeStr(piece);
      const pieceFlipped = piece instanceof Ramp && (piece as Ramp).orientation === Orientation.Left;

      // Snapshot state of all pieces before the tick
      const beforeStates = this._snapshotAllPieces();

      // Interceptor terminates immediately (engine transitions to FINISHED)
      if (piece instanceof Interceptor) {
        this.tick();
        deltas.push({
          tick: tickNum,
          ball: { colour, from: { col: fromCol, row: fromRow }, to: { col: fromCol, row: fromRow }, entryDir },
          pieceType, pieceFlipped,
          exitDir: entryDir, // no real exit
          nextPieceType: null,
          changes: [],
          terminal: true,
          terminalReason: 'interceptor',
        });
        break;
      }

      // Run tick: moves the ball, may change piece state(s)
      this.tick();

      // Snapshot after
      const afterStates = this._snapshotAllPieces();
      const changes = this._diffPieceStates(beforeStates, afterStates);

      // Determine where the ball went
      let toCol: number;
      let toRow: number;
      if (this.activeBalls.length > 0 && this.activeBalls[0].colour === colour) {
        toCol = this.activeBalls[0].x;
        toRow = this.activeBalls[0].y;
      } else if (this.finishedBalls.length > 0) {
        const finished = this.finishedBalls[this.finishedBalls.length - 1];
        toCol = finished.x;
        toRow = finished.y;
      } else {
        toCol = fromCol;
        toRow = fromRow;
      }

      const exitDir: 'left' | 'right' = toCol > fromCol ? 'right' : 'left';

      // Next piece type (for transition path key)
      let nextPieceType: string | null = null;
      const nextPiece = this.board.getPieceAt(toCol, toRow);
      if (nextPiece) nextPieceType = this._pieceTypeStr(nextPiece);

      const terminal = this.getState() === EngineState.FINISHED;

      deltas.push({
        tick: tickNum,
        ball: { colour, from: { col: fromCol, row: fromRow }, to: { col: toCol, row: toRow }, entryDir },
        pieceType, pieceFlipped,
        exitDir,
        nextPieceType,
        changes,
        terminal,
        terminalReason: terminal ? 'no_balls' : undefined,
      });

      if (terminal) break;
    }

    return deltas;
  }

  private _pieceTypeStr(piece: Piece): string {
    if (piece instanceof Bit) return 'bit';
    if (piece instanceof Ramp) return 'ramp';
    if (piece instanceof GearBit) return 'gearbit';
    if (piece instanceof NormalGear) return 'gear';
    if (piece instanceof Interceptor) return 'interceptor';
    return piece.constructor.name.toLowerCase();
  }

  private _snapshotAllPieces(): Map<string, { col: number; row: number; type: string; state: number }> {
    const snap = new Map<string, { col: number; row: number; type: string; state: number }>();
    const grid = this.board.getPieceGrid();
    for (let y = 0; y < grid.length; y++) {
      for (let x = 0; x < grid[y].length; x++) {
        const piece = grid[y][x];
        if (!piece) continue;
        const type = this._pieceTypeStr(piece);
        let state = 0;
        if (piece instanceof FlippablePiece) state = piece.orientation; // 0=Right, 1=Left
        else if (piece instanceof Gear) state = piece.rotation;         // 0=CW, 1=CCW
        snap.set(`${x},${y}`, { col: x, row: y, type, state });
      }
    }
    return snap;
  }

  private _diffPieceStates(
    before: Map<string, { col: number; row: number; type: string; state: number }>,
    after: Map<string, { col: number; row: number; type: string; state: number }>
  ): PieceChange[] {
    const changes: PieceChange[] = [];
    for (const [key, b] of before) {
      const a = after.get(key);
      if (a && a.state !== b.state) {
        changes.push({
          col: b.col, row: b.row, type: b.type,
          event: b.type === 'bit' ? 'flip' : 'rotate',
          before: b.state, after: a.state,
        });
      }
    }
    return changes;
  }
}