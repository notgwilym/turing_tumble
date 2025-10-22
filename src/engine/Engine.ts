import { Board } from "./Board";
import { Ball } from "./Ball";
import { Piece } from "./pieces/Piece";

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

  constructor(redBallsAmount: number = 20, blueBallsAmount: number = 20) {
    this.board = new Board();
    this.leftStartQueue = this.populateStartQueue('red', redBallsAmount);
    this.rightStartQueue = this.populateStartQueue('blue', blueBallsAmount);
    this.transition(StateTransition.INIT_DONE);
  }

  public getState(): EngineState {
    return this.state;
  }

  public getBoard(): Board {
    return this.board;
  }

  public addPiece (piece: Piece) {
    if (this.state !== EngineState.SETUP) {
      throw new Error("Can only add pieces in SETUP state");
    }
    this.board.placePiece(piece);
  }
  // play

  // step
  public step() {
    this.transition(StateTransition.STEP);
    // process one tick
  }

  private tick() {
    this.currentTick += 1;
    // process ball movements
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
      console.warn(`Invalid transition: ${transition} from ${this.state}`);
      return false;
    }

    this.state = transitions[transition]!;
    console.log(`Transitioned to state: ${this.state}`);
  }

}