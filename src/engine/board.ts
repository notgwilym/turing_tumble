import { Piece } from "./pieces/Piece";
import { Crossover } from "./pieces/Crossover";
import { Ramp } from "./pieces/Ramp";
import { Interceptor } from "./pieces/Interceptor";
import { Bit } from "./pieces/Bit";
import { Gear, NormalGear, GearBit, GearSetManager } from "./pieces/Gear";


export enum CellType {
    Blank, 
    Peg,    // used for cogs
    SlotPeg, // used for all other pieces 
    RightExit,
    LeftExit,
}

export class Board {
    private grid: CellType[][];
    private pieceGrid : (Piece | null)[][];
    private startSide: 'left' | 'right';
    private leftEntryX: number;
    private rightEntryX: number;

    private gearSetManager: GearSetManager;

    constructor(width?: number, height?: number, startSide: 'left' | 'right' = 'left', leftEntryX?: number, rightEntryX?: number) {
        this.grid = this.createGrid(width ?? 11, height ?? 11);
        this.pieceGrid = this.createPieceGrid(width ?? 11, height ?? 11);
        this.startSide = startSide;
        this.leftEntryX = leftEntryX ?? 3;
        this.rightEntryX = rightEntryX ?? (width ?? 11) - 4;
        this.gearSetManager = new GearSetManager();
    }

    public placePiece(piece: Piece): void {
        if (piece instanceof Crossover || piece instanceof Ramp || piece instanceof Interceptor || piece instanceof Bit) { // extend as more pieces added
            if (this.grid[piece.y][piece.x] !== CellType.SlotPeg) {
                throw new Error("Cannot place piece here, not a SlotPeg");
            }
            this.pieceGrid[piece.y][piece.x] = piece;
        } else if (piece instanceof Gear) { // gear placement
            if (piece instanceof GearBit) {
                if (this.grid[piece.y][piece.x] !== CellType.SlotPeg) {
                    throw new Error("Cannot place GearBit here, not a SlotPeg");
                }
            } else if (piece instanceof NormalGear) {
                if (!(this.grid[piece.y][piece.x] === CellType.Peg || this.grid[piece.y][piece.x] === CellType.SlotPeg)) {
                    throw new Error("Cannot place NormalGear here, not a Peg or SlotPeg");
                }
            }

            let adjacentGears: Gear[] = [];
            const directions = [
                [0, -1], // above
                [0, 1],  // below
                [-1, 0], // left
                [1, 0],  // right
            ];
            
            for (const [dx, dy] of directions) {
                const nx = piece.x + dx;
                const ny = piece.y + dy;
                if (this.isInBounds(nx, ny)) {
                    const adjacentPiece = this.pieceGrid[ny][nx];
                    if (adjacentPiece instanceof Gear) {
                        adjacentGears.push(adjacentPiece);
                    }
                }
            }

            this.gearSetManager.addGear(piece, adjacentGears);
            this.pieceGrid[piece.y][piece.x] = piece;
        }
    }

    public getGrid(): CellType[][] {
        return this.grid;
    }

    public getPieceGrid(): (Piece | null)[][] {
        return this.pieceGrid;
    }

    public getCellType(x: number, y: number): CellType {
        return this.grid[y][x];
    }

    public getPieceAt(x: number, y: number): Piece | null {
        if (this.isInBounds(x, y)) {
            return this.pieceGrid[y][x];
        } else {
            throw new Error(`Coordinates ${x}, ${y} out of bounds`);
        }
    }

    public getStartSide(): 'left' | 'right' {
        return this.startSide;
    }

    public getLeftEntryX(): number {
        return this.leftEntryX;
    }
    
    public getRightEntryX(): number {
        return this.rightEntryX;
    }

    public getGearSetManager(): GearSetManager {
        return this.gearSetManager;
    }

    private createGrid(width: number, height: number) : CellType[][] {
        if (width % 2 === 0) {
            throw new Error("Width must be odd");
        }
        if (height % 2 === 0) {
            throw new Error("Height must be odd");
        }

        const grid: CellType[][] = [];

        // create checkerboard pattern of Peg and SlotPeg
        for (let y = 0; y < height - 1; y++) {
            const row: CellType[] = [];
            for (let x = 0; x < width; x++) {
                let x_even = x % 2 === 0;
                let y_even = y % 2 === 0;
                if (x_even === y_even) {
                    row.push(CellType.Peg);
                } else {
                    row.push(CellType.SlotPeg);
                }
            }
            grid.push(row);
        }

        // remove top corners
        grid[0][0] = CellType.Blank;
        grid[0][1] = CellType.Blank;
        grid[1][0] = CellType.Blank;

        grid[0][width - 1] = CellType.Blank;
        grid[0][width - 2] = CellType.Blank;
        grid[1][width - 1] = CellType.Blank;

        // remove upper middle peg
        const mid_x = Math.floor(width / 2);
        grid[0][mid_x] = CellType.Blank;

        // add bottom row
        const bottomRow: CellType[] = [];
        for (let x = 0; x < width; x++) {
            if (x < mid_x) {
                bottomRow.push(CellType.LeftExit);
            } else if (x > mid_x) {
                bottomRow.push(CellType.RightExit);
            } else {
                bottomRow.push(CellType.SlotPeg);
            }
        }
        grid.push(bottomRow);

        // add exit row for middle slot peg
        const exitRow: CellType[] = [];
        for (let x = 0; x < width; x++) {
            if (x === mid_x - 1) {
                exitRow.push(CellType.LeftExit);
            } else if (x === mid_x + 1) {
                exitRow.push(CellType.RightExit);
            } else {
                exitRow.push(CellType.Blank);
            }
        }
        grid.push(exitRow);

        return grid;
    }

    private createPieceGrid(width: number, height: number) : (Piece | null)[][] {
        const pieceGrid: (Piece | null)[][] = [];
        for (let y = 0; y < height + 1; y++) {
            const row: (Piece | null)[] = [];
            for (let x = 0; x < width; x++) {
                row.push(null);
            }
            pieceGrid.push(row);
        }
        return pieceGrid;
    }

    private isInBounds(x: number, y: number): boolean {
        return y >= 0 && y < this.pieceGrid.length && x >= 0 && x < this.pieceGrid[0].length;
    }
}