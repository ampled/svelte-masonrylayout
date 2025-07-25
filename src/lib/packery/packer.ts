/**
 * Packer
 * bin-packing algorithm
 */

import { Rect, type RectProps } from './rect.js';

// -------------------------- Packer -------------------------- //

export interface PackerOptions {
  width?: number;
  height?: number;
}

export class Packer {
  width: number;
  height: number;
  spaces!: Rect[];

  constructor(width = 0, height = 0) {
    this.width = width;
    this.height = height;

    this.reset();
  }

  reset(): void {
    this.spaces = [];

    const initialSpace = new Rect({
      x: 0,
      y: 0,
      width: this.width,
      height: this.height
    });

    this.spaces.push(initialSpace);
  }

  /**
   * Add a space back after an item is removed
   */
  addSpace(rect: RectProps): void {
    this.spaces.push(new Rect(rect));
    this.mergeSortSpaces();
  }

  // change x and y of rect to fit with in Packer's available spaces
  pack(rect: RectProps): RectProps {
    for (let i = 0; i < this.spaces.length; i++) {
      const space = this.spaces[i];
      if (space.canFit(rect)) {
        this.placeInSpace(rect, space);
        return rect;
      }
    }
    return rect;
  }

  placeInSpace(rect: RectProps, space: Rect): void {
    // place rect in space
    rect.x = space.x;
    rect.y = space.y;

    this.placed(rect);
  }

  // update spaces with placed rect
  placed(rect: RectProps): void {
    const revisedSpaces: Rect[] = [];

    for (let i = 0; i < this.spaces.length; i++) {
      const space = this.spaces[i];
      const newSpaces = space.getMaximalFreeRects(rect);
      // add either the original space or the new spaces to the revised spaces
      if (newSpaces) {
        revisedSpaces.push(...newSpaces);
      } else {
        revisedSpaces.push(space);
      }
    }

    this.spaces = revisedSpaces;
    this.mergeSortSpaces();
  }

  mergeSortSpaces(): void {
    Packer.mergeRects(this.spaces);
    this.spaces.sort(Packer.spaceSorter);
  }

  // remove redundant spaces
  static mergeRects(rects: Rect[]): void {
    for (let i = 0; i < rects.length; i++) {
      const rect = rects[i];
      if (!rect) {
        continue;
      }
      // clone rects we're testing, remove this rect
      const compareRects = rects.slice(0);
      compareRects.splice(i, 1);

      const removedCount = Packer.removeRectFromRects(rect, compareRects);
      // remove redundant rects from teste rects
      for (let j = 0; j < removedCount; j++) {
        rects.splice(i, 1);
      }
    }
  }

  // remove a rect from a set of rects if it is contained by another rect
  static removeRectFromRects(targetRect: Rect, rects: Rect[]): number {
    let removedCount = 0;

    for (let i = 0; i < rects.length; i++) {
      const rect = rects[i];
      if (!rect) {
        continue;
      }

      const isContained = rect.contains(targetRect);
      if (isContained) {
        rects.splice(i, 1);
        removedCount++;
        i--;
      }
    }

    return removedCount;
  }

  static spaceSorter(a: Rect, b: Rect): number {
    return a.y - b.y || a.x - b.x;
  }
}

export default Packer;
