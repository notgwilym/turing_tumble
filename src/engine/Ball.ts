export class Ball {
    colour: 'red' | 'blue';
    x: number;
    y: number;
    prev_x: number;
    prev_y: number;

    constructor(colour: 'red' | 'blue') {
        this.colour = colour;
        this.x = -1;
        this.y = -1;

        // reds come in from left
        if (colour === 'red') {
            this.prev_x = -1;
            this.prev_y = -1;
        } 
        // blues from right
        else {
            this.prev_x = 99999;    
            this.prev_y = -1;
        }
    }

    moveTo(newX: number, newY: number) {
        this.prev_x = this.x;
        this.prev_y = this.y;
        this.x = newX;
        this.y = newY;
        console.log(`Ball moved to (${this.x}, ${this.y})`);
    }
}