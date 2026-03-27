# Virtual Turing Tumble

A web-based digital implementation of [Turing Tumble](https://www.turingtumble.com/), a marble-drop puzzle game that teaches computational thinking through physical interaction.

Built with TypeScript, Svelte 5, and SVG rendering.

**[Video Demo]([https://youtu.be/C9eKqGsn-y8])**


## Features

- **All six piece types**: Bit, Ramp, Crossover, Interceptor, Gear, and GearBit with correct behaviour
- **Deterministic simulation**: Identical input always produces identical output
- **Drag-and-drop interface**: Place pieces from toolbar, move between cells, drag off to delete
- **Smooth animation**: Ball follows authored SVG paths; pieces animate flips and rotations
- **Playback controls**: Play, Pause, Step, and Stop with state machine enforcement

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later recommended)
- npm or pnpm

### Installation
```bash
# Clone the repository
git clone https://github.com/notgwilym/turing_tumble.git
cd turing_tumble

# Install dependencies
npm install

# Start development server
npm run dev
```

The application will be available at `http://localhost:5173`.

### Build for Production
```bash
npm run build
npm run preview  # Preview the production build
```

## Usage

1. **Place pieces**: Drag pieces from the toolbar on the left onto the board
2. **Configure pieces**: Click placed pieces to flip (Bit, Ramp) or rotate gear sets (GearBit)
3. **Run simulation**: Press Play to watch the full simulation, or Step to advance one tick at a time
4. **Reset**: Press Stop to return to setup mode

## Project Structure
```
src/
├── engine/           # Core simulation logic (framework-agnostic)
│   ├── Engine.ts     # State machine, simulation lifecycle
│   ├── Board.ts      # Grid representation, piece placement
│   └── pieces/       # Piece classes (Bit, Ramp, Gear, etc.)
├── app/
│   └── components/
│       ├── Board/        # Board, Cell, PieceSprite components
│       ├── Animation/    # AnimationController, path sampling
│       ├── Controls/     # Playback buttons, status display
│       └── Toolbar/      # Piece palette
└── assets/           # SVG artwork for pieces and balls
```

## Technical Documentation

### Engine State Machine

The simulation lifecycle is governed by five states:

| State | Description |
|-------|-------------|
| `INIT` | System created, no board loaded |
| `SETUP` | Board ready; pieces can be placed/removed |
| `RUNNING` | Simulation executing automatically |
| `FROZEN` | Paused mid-simulation; can step or resume |
| `FINISHED` | Terminal condition reached (Interceptor or empty queue) |

Valid transitions:
```
INIT ──init_done──► SETUP
SETUP ──play──► RUNNING
SETUP ──step──► FROZEN
RUNNING ──pause──► FROZEN
RUNNING ──stop──► SETUP
RUNNING ──terminal──► FINISHED
FROZEN ──play──► RUNNING
FROZEN ──stop──► SETUP
FROZEN ──step──► FROZEN
FROZEN ──terminal──► FINISHED
FINISHED ──stop──► SETUP
```

### Animation System

Ball animation uses pre-authored SVG paths sampled via `getPointAtLength()`. Each piece has paths for left/right entry; speed profiles control acceleration. Animation events trigger piece state changes (flips, rotations) at specific progress points.

## Tech Stack

- **Framework**: [Svelte 5](https://svelte.dev/) with runes-based reactivity
- **Language**: TypeScript
- **Build**: [Vite](https://vitejs.dev/)
- **Rendering**: SVG
- **Drag-and-drop**: Native HTML5 API

## Academic Context

This project was developed as a BSc Computer Science dissertation at the University of Glasgow (2025–26). The dissertation explores the design and implementation of an accessible, deterministic digital Turing Tumble with smooth path-based animation.

[## License]: # 

## Acknowledgements

- [Turing Tumble](https://www.turingtumble.com/) by Upper Story
- Supervisor: Alice Miller
