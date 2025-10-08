export class Engine {
  private counter = 0;

  constructor() {
    console.log("Engine initialized!");
  }

  increment(): number {
    this.counter++;
    console.log(`Engine counter: ${this.counter}`);
    return this.counter;
  }

  reset(): void {
    this.counter = 0;
  }

  get state() {
    return { counter: this.counter };
  }
}