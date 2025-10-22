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
        if (colour === 'red') {
            this.prev_x = -1;
            this.prev_y = -1;
        } else if (colour === 'blue') {
            this.prev_x = 99999;    
            this.prev_y = -1;
        } else {
            throw new Error("Invalid ball colour");
        }
    }

    moveTo(newX: number, newY: number) {
        this.prev_x = this.x;
        this.prev_y = this.y;
        this.x = newX;
        this.y = newY;
    }
}