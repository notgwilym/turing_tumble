import { Piece } from "./pieces/Piece";
import { Crossover } from "./pieces/Crossover";
import { Ramp } from "./pieces/Ramp";

enum CellType {
    Blank, 
    Peg,    // used for cogs
    SlotPeg, // used for all other pieces 
    RightExit,
    LeftExit,
}

export class Board {
    private grid: CellType[][];
    private pieceGrid : (Piece | null)[][];

    constructor(width?: number, height?: number) {
        this.grid = this.createGrid(width ?? 11, height ?? 11);
        this.pieceGrid = this.createPieceGrid(width ?? 11, height ?? 11);
    }

    public placePiece(piece: Piece): void {
        if (piece instanceof Crossover || piece instanceof Ramp) { // extend as more pieces added
            if (this.grid[piece.y][piece.x] !== CellType.SlotPeg) {
                throw new Error("Cannot place piece here, not a SlotPeg");
            }
            this.pieceGrid[piece.y][piece.x] = piece;
        }
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
        for (let y = 0; y < height; y++) {
            const row: (Piece | null)[] = [];
            for (let x = 0; x < width; x++) {
                row.push(null);
            }
            pieceGrid.push(row);
        }
        return pieceGrid;
    }
}