enum CellType {
    Blank, 
    Peg,    // used for cogs
    SlotPeg, // used for all other pieces 
    RightExit,
    LeftExit,
}

export class Board {
    private grid: CellType[][];

    constructor(width?: number, height?: number) {
        this.grid = this.createGrid(width ?? 11, height ?? 11);
    }

    private createGrid(width: number, height: number) : CellType[][] {
        if (width % 2 === 0) {
            throw new Error("Width must be odd");
        }
        if (height % 2 === 0) {
            throw new Error("Height must be odd");
        }

        const grid: CellType[][] = [];
        for (let y = 0; y < height; y++) {
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
        return grid;
    }
}