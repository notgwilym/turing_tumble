import { Piece } from "./Piece";
import type { Ball } from "../Ball";

export enum GearRotation {
  Clockwise = 0,
  Counterclockwise = 1,
}

export abstract class Gear extends Piece {
  rotation: GearRotation;
  setId: number | null = null; // which set this gear belongs to

  constructor(x: number, y: number, rotation: GearRotation = GearRotation.Clockwise) {
    super(x, y);
    this.rotation = rotation;
  }

  turn(): void {
    this.rotation = this.rotation === GearRotation.Clockwise 
      ? GearRotation.Counterclockwise 
      : GearRotation.Clockwise;
  }

  abstract handleBall(ball: Ball): void;
}

export class NormalGear extends Gear {
  handleBall(ball: Ball): void {
    throw new Error("Normal gears cannot be placed on ball paths");
  }
}

export class GearBit extends Gear {
  handleBall(ball: Ball): void {
    // move ball down and left or right based on gear rotation
    if (this.rotation === GearRotation.Counterclockwise) {
      ball.moveTo(this.x + 1, this.y + 1);
    } else {
      ball.moveTo(this.x - 1, this.y + 1);
    }

    this.turn();
  }
}

export class GearSetManager {
  private sets: Map<number, Set<Gear>> = new Map();
  private nextSetId: number = 0;

  getSet(gear: Gear): Set<Gear> | null {
    if (gear.setId === null) return null;
    return this.sets.get(gear.setId) || null;
  }

  // turn all gears in the set containing the given gear
  turnGear(gear: Gear): void {
    const gearSet = this.getSet(gear);
    if (!gearSet) {
      throw new Error("Gear does not belong to any set");
    }

    for (const g of gearSet) {
      g.turn();
    }
  }

  addGear(gear: Gear, adjacentGears: Gear[]): void {
    if (adjacentGears.length === 0) {
      // no adjacent gears - create new set
      this.createNewSet(gear);
      return;
    }

    if (adjacentGears.length === 1) {
      // one adjacent gear - add to its set
      const adjacentGear = adjacentGears[0];
      gear.rotation = this.getOppositeRotation(adjacentGear.rotation);
      this.addToSet(gear, adjacentGear.setId!);
      return;
    }

    // multiple adjacent gears - need to merge sets
    this.mergeGearSets(gear, adjacentGears);
  }

  removeGear(gear: Gear): void {
    if (gear.setId === null) return;

    const gearSet = this.sets.get(gear.setId);
    if (gearSet) {
      gearSet.delete(gear);
      
      // remove set if empty
      if (gearSet.size === 0) {
        this.sets.delete(gear.setId);
      }
    }
    
    gear.setId = null;
  }

  private createNewSet(gear: Gear): void {
    const setId = this.nextSetId++;
    this.sets.set(setId, new Set([gear]));
    gear.setId = setId;
  }

  private addToSet(gear: Gear, setId: number): void {
    const gearSet = this.sets.get(setId);
    if (gearSet) {
      gearSet.add(gear);
      gear.setId = setId;
    }
  }

  private getOppositeRotation(rotation: GearRotation): GearRotation {
    return rotation === GearRotation.Clockwise 
      ? GearRotation.Counterclockwise 
      : GearRotation.Clockwise;
  }

  private mergeGearSets(newGear: Gear, adjacentGears: Gear[]): void {
    // get all unique set IDs from adjacent gears
    const setIds = new Set(adjacentGears.map(g => g.setId).filter(id => id !== null) as number[]);
    
    // find the largest set
    let largestSetId: number | null = null;
    let largestSetSize = 0;
    let referenceGear: Gear | null = null;

    for (const setId of setIds) {
      const gearSet = this.sets.get(setId);
      if (gearSet && gearSet.size > largestSetSize) {
        largestSetSize = gearSet.size;
        largestSetId = setId;
        // find the adjacent gear from this set
        referenceGear = adjacentGears.find(g => g.setId === setId) || null;
      }
    }

    if (largestSetId === null || !referenceGear) {
      // fallback to creating new set - should not happen
      this.createNewSet(newGear);
      return;
    }

    newGear.rotation = this.getOppositeRotation(referenceGear.rotation);

    // check other sets and turn if necessary
    const setsToMerge: number[] = [largestSetId];
    
    for (const adjacentGear of adjacentGears) {
      if (adjacentGear.setId === null || adjacentGear.setId === largestSetId) {
        continue;
      }

      // if this adjacent gear has same rotation as new gear, turn its entire set
      if (adjacentGear.rotation === newGear.rotation) {
        this.turnGear(adjacentGear);
      }

      setsToMerge.push(adjacentGear.setId);
    }

    // merge all sets into the largest one
    const targetSet = this.sets.get(largestSetId)!;
    
    for (const setId of setsToMerge) {
      if (setId === largestSetId) continue;
      
      const setToMerge = this.sets.get(setId);
      if (setToMerge) {
        for (const gear of setToMerge) {
          gear.setId = largestSetId;
          targetSet.add(gear);
        }
        this.sets.delete(setId);
      }
    }

    // add new gear to merged set
    this.addToSet(newGear, largestSetId);
  }

  // debug helper
  getAllSets(): Map<number, Set<Gear>> {
    return this.sets;
  }
}