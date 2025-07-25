/*!
 * This is a slightly modified TypeScript port of Masonry by David Desandro
 * https://masonry.desandro.com/
 */

import type { EventListener } from './ev-emitter.js';
import { Outlayer, type OutlayerOptions } from './outlayer/outlayer.js';
import { getSize } from './get-size.js';
import { Item, type Position } from './outlayer/item.js';

// ----- Types ----- //

type MasonryEvent = 'layoutComplete' | 'removeComplete';

export interface MasonryOptions extends OutlayerOptions {
  fitWidth?: boolean;
  horizontalOrder?: boolean;

  /**
   * @deprecated use `fitWidth`
   */
  isFitWidth?: boolean;
}

export interface ColPosition {
  col: number;
  y: number;
}

// -------------------------- Masonry Definition -------------------------- //

class Masonry extends Outlayer.create('masonry') {
  static override namespace = 'masonry';

  // add fitWidth to compatOptions
  static override compatOptions = {
    ...Outlayer.compatOptions,
    fitWidth: 'isFitWidth'
  };

  // instance properties
  columnWidth = 0;
  gutter = 0;
  cols = 0;
  colYs: number[] = [];
  maxY = 0;
  horizontalColIndex = 0;
  containerWidth = 0;

  declare options: MasonryOptions;

  constructor(elem: string | Element, options: MasonryOptions) {
    super(elem, options);

    // this.colYs = [];
    // this._resetLayout();
  }

  _resetLayout(): void {
    this.getSize();
    this._getMeasurement('columnWidth', 'outerWidth');
    this._getMeasurement('gutter', 'outerWidth');
    this.measureColumns();

    // reset column Y
    this.colYs = [];
    for (let i = 0; i < this.cols; i++) {
      this.colYs.push(0);
    }

    this.maxY = 0;
    this.horizontalColIndex = 0;
  }

  measureColumns(): void {
    this.getContainerWidth();

    // if columnWidth is 0, default to outerWidth of first item
    if (!this.columnWidth) {
      const firstItem = this.items[0];
      const firstItemElem = firstItem && firstItem.element;
      // columnWidth fall back to item of first element
      this.columnWidth =
        (firstItemElem && getSize(firstItemElem)?.outerWidth) ||
        // if first elem has no width, default to size of container
        this.containerWidth;
    }

    const columnWidth = (this.columnWidth += this.gutter);

    // calculate columns
    const containerWidth = this.containerWidth + this.gutter;
    let cols = containerWidth / columnWidth;

    // fix rounding errors, typically with gutters
    const excess = columnWidth - (containerWidth % columnWidth);
    // if overshoot is less than a pixel, round up, otherwise floor it
    const mathMethod = excess && excess < 1 ? 'round' : 'floor';
    cols = Math[mathMethod](cols);
    this.cols = Math.max(cols, 1);
  }

  getContainerWidth(): void {
    // container is parent if fit width
    const isFitWidth = this._getOption('fitWidth');
    const container = isFitWidth ? (this.element.parentNode as Element) : this.element;

    // check that this.size and size are there
    // IE8 triggers resize on body size change, so they might not be
    const size = getSize(container);
    this.containerWidth = size?.innerWidth || 0;
  }

  override _getItemLayoutPosition(item: Item) {
    item.getSize();

    if (item.size) {
      // how many columns does this brick span
      const remainder = item.size!.outerWidth % this.columnWidth;
      const mathMethod = remainder && remainder < 1 ? 'round' : 'ceil';
      let colSpan = Math[mathMethod](item.size!.outerWidth / this.columnWidth);
      colSpan = Math.min(colSpan, this.cols);

      // use horizontal or top column position
      const colPosMethod = this.options.horizontalOrder
        ? this._getHorizontalColPosition
        : this._getTopColPosition;
      const colPosition = colPosMethod.apply(this, [colSpan, item]);

      // position the brick
      const position: Position = {
        x: this.columnWidth * colPosition.col,
        y: colPosition.y
      };

      // apply setHeight to necessary columns
      const setHeight = colPosition.y + item.size!.outerHeight;
      const setMax = colSpan + colPosition.col;
      for (let i = colPosition.col; i < setMax; i++) {
        this.colYs[i] = setHeight;
      }

      return position;
    }
    return undefined;
  }

  _getTopColPosition(colSpan: number): ColPosition {
    const colGroup = this._getTopColGroup(colSpan);
    // get the minimum Y value from the columns
    const minimumY = Math.min(...colGroup);

    return {
      col: colGroup.indexOf(minimumY),
      y: minimumY
    };
  }

  /**
   * @param colSpan - number of columns the element spans
   * @returns colGroup
   */
  _getTopColGroup(colSpan: number): number[] {
    if (colSpan < 2) {
      // if brick spans only one column, use all the column Ys
      return this.colYs;
    }

    const colGroup: number[] = [];
    // how many different places could this brick fit horizontally
    const groupCount = this.cols + 1 - colSpan;
    // for each group potential horizontal position
    for (let i = 0; i < groupCount; i++) {
      colGroup[i] = this._getColGroupY(i, colSpan);
    }
    return colGroup;
  }

  _getColGroupY(col: number, colSpan: number): number {
    if (colSpan < 2) {
      return this.colYs[col];
    }
    // make an array of colY values for that one group
    const groupColYs = this.colYs.slice(col, col + colSpan);
    // and get the max value of the array
    return Math.max(...groupColYs);
  }

  // get column position based on horizontal index. #873
  _getHorizontalColPosition(colSpan: number, item: Item): ColPosition {
    let col = this.horizontalColIndex % this.cols;
    const isOver = colSpan > 1 && col + colSpan > this.cols;
    // shift to next row if item can't fit on current row
    col = isOver ? 0 : col;
    // don't let zero-size items take up space
    const hasSize = item.size!.outerWidth && item.size!.outerHeight;
    this.horizontalColIndex = hasSize ? col + colSpan : this.horizontalColIndex;

    return {
      col: col,
      y: this._getColGroupY(col, colSpan)
    };
  }

  override _manageStamp(stamp: Element): void {
    const stampSize = getSize(stamp);
    const offset = this._getElementOffset(stamp);
    if (!stampSize) return;

    // get the columns that this stamp affects
    const isOriginLeft = this._getOption('originLeft');
    const firstX = isOriginLeft ? offset.left : offset.right;
    const lastX = firstX + stampSize.outerWidth;
    let firstCol = Math.floor(firstX / this.columnWidth);
    firstCol = Math.max(0, firstCol);
    let lastCol = Math.floor(lastX / this.columnWidth);
    // lastCol should not go over if multiple of columnWidth #425
    lastCol -= lastX % this.columnWidth ? 0 : 1;
    lastCol = Math.min(this.cols - 1, lastCol);

    // set colYs to bottom of the stamp
    const isOriginTop = this._getOption('originTop');
    const stampMaxY = (isOriginTop ? offset.top : offset.bottom) + stampSize.outerHeight;
    for (let i = firstCol; i <= lastCol; i++) {
      this.colYs[i] = Math.max(stampMaxY, this.colYs[i]);
    }
  }

  override _getContainerSize(): { width?: number; height?: number } | null {
    if (this.colYs) {
      this.maxY = Math.max(...this.colYs);
      const size: { width?: number; height?: number } = {
        height: this.maxY
      };

      if (this._getOption('fitWidth')) {
        size.width = this._getContainerFitWidth();
      }

      return size;
    }
    return null;
  }

  _getContainerFitWidth(): number {
    let unusedCols = 0;
    // count unused columns
    let i = this.cols;
    while (--i) {
      if (this.colYs[i] !== 0) {
        break;
      }
      unusedCols++;
    }
    // fit container to columns that have been used
    return (this.cols - unusedCols) * this.columnWidth - this.gutter;
  }

  override needsResizeLayout(): boolean {
    const previousWidth = this.containerWidth;
    this.getContainerWidth();
    return previousWidth !== this.containerWidth;
  }

  once(event: MasonryEvent, listener: EventListener) {
    return super.once(event, listener);
  }

  on(event: MasonryEvent, listener: EventListener) {
    return super.on(event, listener);
  }

  off(event: MasonryEvent, listener: EventListener) {
    console.log('off!!', event);
    return super.off(event, listener);
  }

  /**
   * set options
   */
  option(opts: MasonryOptions): void {
    this.options = { ...this.options, ...opts };
  }
}

export default Masonry;
export { Masonry };
