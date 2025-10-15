export class Ball {
    colour: 'red' | 'blue';
    x: number;
    y: number;
    prev_x: number;
    prev_y: number;
    
    constructor(colour: 'red' | 'blue', x: number, y: number) {
        this.colour = colour;
        this.x = x;
        this.y = y;
        this.prev_x = x;
        this.prev_y = y;
    }

    moveTo(newX: number, newY: number) {
        this.prev_x = this.x;
        this.prev_y = this.y;
        this.x = newX;
        this.y = newY;
    }
}