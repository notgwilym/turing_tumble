# Virtual Turing Tumble
A virtual web-based version of the puzzle game Turing Tumble, using TypeScript + Svelte.
Created for Gwilym's Computer Science BSc individual project.

# Documentation

Engine State System (not yet implemented)
Inspired by game state flow of Zachtronics' game *Opus Magnum*, although this is a common pattern in computation puzzles.

States 

INIT - Default starting start, blank board.
SETUP - Users can change board state (ie. pieces can be be added removed oriented moved copied).
RUNNING - Actively progressing state with game ticks automatically. Tick rate determine game speed.
FROZEN - Game state paused. User can step through game ticks one by one, backwards and forwards. They can also resume running the engine.
FINISHED - Game has reached terminating state (eg. balls have run out, ball in Interceptor piece). Analysis can done on this state to determine whether it fulfills the requirements of puzzle solution.

State Transitions

START_STATE message -> process? -> END_STATE

INIT init_done -> SETUP
SETUP play -> RUNNING
SETUP step -> iterate_gamestate() -> FROZEN
RUNNING pause -> FROZEN
RUNNING stop -> SETUP
FROZEN play -> RUNNING
FROZEN stop -> SETUP
FROZEN step -> iterate_gamestate() -> FROZEN
FROZEN terminal_state -> FINISHED
RUNNING terminal_state -> FINISHED