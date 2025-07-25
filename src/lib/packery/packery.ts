/* eslint-disable @typescript-eslint/no-unsafe-function-type */
/* eslint-disable @typescript-eslint/no-explicit-any */
/*!
 * Packery v3.0.0
 * Gapless, draggable grid layouts
 * MIT License
 * https://packery.metafizzy.co
 * Copyright 2013-2025 Metafizzy
 */

import { getSize } from '../masonry/get-size.js';
import { Outlayer, type OutlayerOptions } from '../masonry/outlayer/outlayer.js';
import { Rect } from './rect.js';
import { Packer } from './packer.js';
import { PackeryItem } from './item.js';
import type { Position } from '$lib/masonry/outlayer/item.js';

// -------------------------- Types -------------------------- //

export interface PackeryOptions extends OutlayerOptions {
  columnWidth?: number | string | Element;
  rowHeight?: number | string | Element;
  gutter?: number | string | Element;
  horizontal?: boolean;
  shiftPercentResize?: boolean;
}

export interface DragPosition {
  x: number;
  y: number;
  top: number;
  left: number;
}

export interface ShiftTarget {
  x: number;
  y: number;
}

export interface DragHandlers {
  dragStart(): void;
  dragMove(): void;
  dragEnd(): void;
}

export interface UIDragHandlers {
  start(event: Event, ui?: { position?: DragPosition }): void;
  drag(event: Event, ui?: { position?: DragPosition }): void;
  stop(event: Event, ui?: { position?: DragPosition }): void;
}

export interface Draggabilly {
  on(event: string, handler: () => void): void;
  off(event: string, handler: () => void): void;
}

export interface JQueryDraggable {
  on(event: string, handler: Function): JQueryDraggable;
  off(event: string, handler: Function): JQueryDraggable;
}

// -------------------------- Rect Enhancement -------------------------- //

// allow for pixel rounding errors IE8-IE11 & Firefox; #227
Rect.prototype.canFit = function (rect) {
  return this.width >= (rect.width || 0) - 1 && this.height >= (rect.height || 0) - 1;
};

// -------------------------- Packery -------------------------- //

export class Packery extends Outlayer {
  static Item = PackeryItem;
  static Rect = Rect;
  static Packer = Packer;

  packer!: Packer;
  shiftPacker!: Packer;
  isEnabled = true;
  dragItemCount = 0;
  maxX = 0;
  maxY = 0;
  isShifting?: boolean;
  items: PackeryItem[] = [];

  // drag handlers
  handleDraggabilly!: DragHandlers;
  handleUIDraggable!: UIDragHandlers;

  // shift targets
  shiftTargetKeys!: string[];
  shiftTargets!: ShiftTarget[];

  // drag timing
  private _itemDragTime?: Date;
  private dragTimeout?: number;

  // measurements
  columnWidth?: number;
  rowHeight?: number;
  gutter = 0;
  position!: Position;

  _create(): void {
    // call super
    super._create();

    // initial properties
    this.packer = new Packer();
    // packer for drop targets
    this.shiftPacker = new Packer();
    this.isEnabled = true;

    this.dragItemCount = 0;

    // create drag handlers
    this.handleDraggabilly = {
      dragStart: () => {
        this.itemDragStart(this.element);
      },
      dragMove: () => {
        this.itemDragMove(this.element, this.position.x, this.position.y);
      },
      dragEnd: () => {
        this.itemDragEnd(this.element);
      }
    };

    this.handleUIDraggable = {
      start: (event: Event, ui?: { position?: DragPosition }) => {
        // HTML5 may trigger dragstart, dismiss HTML5 dragging
        if (!ui) {
          return;
        }
        this.itemDragStart(event.currentTarget as Element);
      },
      drag: (event: Event, ui?: { position?: DragPosition }) => {
        if (!ui || !ui.position) {
          return;
        }
        this.itemDragMove(event.currentTarget as Element, ui.position.left, ui.position.top);
      },
      stop: (event: Event, ui?: { position?: DragPosition }) => {
        if (!ui) {
          return;
        }
        this.itemDragEnd(event.currentTarget as Element);
      }
    };
  }

  // ----- init & layout ----- //

  /**
   * logic before any new layout
   */
  _resetLayout(): void {
    this.getSize();

    this._getMeasurements();

    // reset packer
    let width: number, height: number, sortDirection: string;
    // packer settings, if horizontal or vertical
    if (this._getOption('horizontal')) {
      width = Infinity;
      height = this.size.innerHeight + this.gutter;
      sortDirection = 'rightwardTopToBottom';
    } else {
      width = this.size.innerWidth + this.gutter;
      height = Infinity;
      sortDirection = 'downwardLeftToRight';
    }

    this.packer.width = this.shiftPacker.width = width;
    this.packer.height = this.shiftPacker.height = height;
    (this.packer as any).sortDirection = (this.shiftPacker as any).sortDirection = sortDirection;

    this.packer.reset();

    // layout
    this.maxY = 0;
    this.maxX = 0;
  }

  /**
   * update columnWidth, rowHeight, & gutter
   */
  private _getMeasurements(): void {
    this._getMeasurement('columnWidth', 'width');
    this._getMeasurement('rowHeight', 'height');
    this._getMeasurement('gutter', 'width');
  }

  _getItemLayoutPosition(item: PackeryItem) {
    this._setRectSize(item.element, item.rect);
    if (this.isShifting || this.dragItemCount > 0) {
      const packMethod = this._getPackMethod();
      (this.packer as any)[packMethod](item.rect);
    } else {
      this.packer.pack(item.rect);
    }

    this._setMaxXY(item.rect);
    return item.rect;
  }

  shiftLayout(): void {
    this.isShifting = true;
    this.layout();
    delete this.isShifting;
  }

  private _getPackMethod(): string {
    return this._getOption('horizontal') ? 'rowPack' : 'columnPack';
  }

  /**
   * set max X and Y value, for size of container
   */
  private _setMaxXY(rect: Rect): void {
    this.maxX = Math.max(rect.x + rect.width, this.maxX);
    this.maxY = Math.max(rect.y + rect.height, this.maxY);
  }

  /**
   * set the width and height of a rect, applying columnWidth and rowHeight
   */
  _setRectSize(elem: Element, rect: Rect): void {
    const size = getSize(elem);
    if (!size) return;
    let w = size.outerWidth;
    let h = size.outerHeight;
    // size for columnWidth and rowHeight, if available
    // only check if size is non-zero, #177
    if (w || h) {
      w = this._applyGridGutter(w, this.columnWidth);
      h = this._applyGridGutter(h, this.rowHeight);
    }
    // rect must fit in packer
    rect.width = Math.min(w, this.packer.width);
    rect.height = Math.min(h, this.packer.height);
  }

  /**
   * fits item to columnWidth/rowHeight and adds gutter
   */
  private _applyGridGutter(measurement: number, gridSize?: number): number {
    // just add gutter if no gridSize
    if (!gridSize) {
      return measurement + this.gutter;
    }
    gridSize += this.gutter;
    // fit item to columnWidth/rowHeight
    const remainder = measurement % gridSize;
    const mathMethod = remainder && remainder < 1 ? 'round' : 'ceil';
    measurement = Math[mathMethod](measurement / gridSize) * gridSize;
    return measurement;
  }

  _getContainerSize() {
    if (this._getOption('horizontal')) {
      return {
        width: this.maxX - this.gutter
      };
    } else {
      return {
        height: this.maxY - this.gutter
      };
    }
  }

  // -------------------------- stamp -------------------------- //

  /**
   * makes space for element
   */
  _manageStamp(elem: Element): void {
    const item = this.getItem(elem) as PackeryItem;
    let rect: Rect;
    if (item && item.isPlacing) {
      rect = item.rect;
    } else {
      const offset = this._getElementOffset(elem);
      rect = new Rect({
        x: this._getOption('originLeft') ? offset.left : offset.right,
        y: this._getOption('originTop') ? offset.top : offset.bottom
      });
    }

    this._setRectSize(elem, rect);
    // save its space in the packer
    this.packer.placed(rect);
    this._setMaxXY(rect);
  }

  // -------------------------- methods -------------------------- //

  private static verticalSorter(a: PackeryItem, b: PackeryItem): number {
    return a.position.y - b.position.y || a.position.x - b.position.x;
  }

  private static horizontalSorter(a: PackeryItem, b: PackeryItem): number {
    return a.position.x - b.position.x || a.position.y - b.position.y;
  }

  sortItemsByPosition(): void {
    const sorter = this._getOption('horizontal')
      ? Packery.horizontalSorter
      : Packery.verticalSorter;
    this.items.sort(sorter);
  }

  /**
   * Fit item element in its current position
   * Packery will position elements around it
   * useful for expanding elements
   */
  fit(elem: Element, x?: number, y?: number): void {
    const item = this.getItem(elem) as PackeryItem;
    if (!item) {
      return;
    }

    // stamp item to get it out of layout
    this.stamp(item.element);
    // set placing flag
    item.enablePlacing();
    this.updateShiftTargets(item);
    // fall back to current position for fitting
    x = x === undefined ? item.rect.x : x;
    y = y === undefined ? item.rect.y : y;
    // position it best at its destination
    this.shift(item, x, y);
    this._bindFitEvents(item);
    item.moveTo(item.rect.x, item.rect.y);
    // layout everything else
    this.shiftLayout();
    // return back to regularly scheduled programming
    this.unstamp(item.element);
    this.sortItemsByPosition();
    item.disablePlacing();
  }

  /**
   * emit event when item is fit and other items are laid out
   */
  private _bindFitEvents(item: PackeryItem): void {
    let ticks = 0;
    const onLayout = () => {
      ticks++;
      if (ticks !== 2) {
        return;
      }
      this.dispatchEvent('fitComplete', undefined, [item]);
    };
    // when item is laid out
    item.once('layout', onLayout);
    // when all items are laid out
    this.once('layoutComplete', onLayout);
  }

  // -------------------------- resize -------------------------- //

  resize(): void {
    // don't trigger if size did not change
    // or if resize was unbound. See #285, outlayer#9
    if (!this.isResizeBound || !this.needsResizeLayout()) {
      return;
    }

    if ((this.options as PackeryOptions).shiftPercentResize) {
      this.resizeShiftPercentLayout();
    } else {
      this.layout();
    }
  }

  /**
   * check if layout is needed post layout
   */
  needsResizeLayout(): boolean {
    const size = getSize(this.element);
    if (!size) return false;
    const innerSize = this._getOption('horizontal') ? 'innerHeight' : 'innerWidth';
    return size[innerSize] !== this.size[innerSize];
  }

  resizeShiftPercentLayout(): void {
    const items = this._getItemsForLayout(this.items) as PackeryItem[];

    const isHorizontal = this._getOption('horizontal');
    const coord = isHorizontal ? 'y' : 'x';
    const measure = isHorizontal ? 'height' : 'width';
    const segmentName = isHorizontal ? 'rowHeight' : 'columnWidth';
    const innerSize = isHorizontal ? 'innerHeight' : 'innerWidth';

    // proportional re-align items
    let previousSegment = this[segmentName as keyof this] as number;
    previousSegment = previousSegment && previousSegment + this.gutter;

    if (previousSegment) {
      this._getMeasurements();
      const currentSegment = (this[segmentName as keyof this] as number) + this.gutter;
      items.forEach((item) => {
        const seg = Math.round(item.rect[coord] / previousSegment);
        item.rect[coord] = seg * currentSegment;
      });
    } else {
      const size = getSize(this.element);
      if (!size) return;
      const currentSize = size[innerSize] + this.gutter;
      const previousSize = this.packer[measure];
      items.forEach((item) => {
        item.rect[coord] = (item.rect[coord] / previousSize) * currentSize;
      });
    }

    this.shiftLayout();
  }

  // -------------------------- drag -------------------------- //

  /**
   * handle an item drag start event
   */
  itemDragStart(elem: Element): void {
    if (!this.isEnabled) {
      return;
    }
    this.stamp(elem);
    const item = this.getItem(elem) as PackeryItem;
    if (!item) {
      return;
    }

    item.enablePlacing();
    item.showDropPlaceholder();
    this.dragItemCount++;
    this.updateShiftTargets(item);
  }

  updateShiftTargets(dropItem: PackeryItem): void {
    this.shiftPacker.reset();

    // pack stamps
    this._getBoundingRect();
    const isOriginLeft = this._getOption('originLeft');
    const isOriginTop = this._getOption('originTop');
    this.stamps.forEach((stamp) => {
      // ignore dragged item
      const item = this.getItem(stamp) as PackeryItem;
      if (item && item.isPlacing) {
        return;
      }
      const offset = this._getElementOffset(stamp);
      const rect = new Rect({
        x: isOriginLeft ? offset.left : offset.right,
        y: isOriginTop ? offset.top : offset.bottom
      });
      this._setRectSize(stamp, rect);
      // save its space in the packer
      this.shiftPacker.placed(rect);
    });

    // reset shiftTargets
    const isHorizontal = this._getOption('horizontal');
    const segmentName = isHorizontal ? 'rowHeight' : 'columnWidth';
    const measure = isHorizontal ? 'height' : 'width';

    this.shiftTargetKeys = [];
    this.shiftTargets = [];
    let boundsSize: number;
    let segment = this[segmentName as keyof this] as number;
    segment = segment && segment + this.gutter;

    if (segment) {
      const segmentSpan = Math.ceil(dropItem.rect[measure] / segment);
      const segs = Math.floor((this.shiftPacker[measure] + this.gutter) / segment);
      boundsSize = (segs - segmentSpan) * segment;
      // add targets on top
      for (let i = 0; i < segs; i++) {
        const initialX = isHorizontal ? 0 : i * segment;
        const initialY = isHorizontal ? i * segment : 0;
        this._addShiftTarget(initialX, initialY, boundsSize);
      }
    } else {
      boundsSize = this.shiftPacker[measure] + this.gutter - dropItem.rect[measure];
      this._addShiftTarget(0, 0, boundsSize);
    }

    // pack each item to measure where shiftTargets are
    const items = this._getItemsForLayout(this.items) as PackeryItem[];
    const packMethod = this._getPackMethod();
    items.forEach((item) => {
      const rect = item.rect;
      this._setRectSize(item.element, rect);
      (this.shiftPacker as any)[packMethod](rect);

      // add top left corner
      this._addShiftTarget(rect.x, rect.y, boundsSize);
      // add bottom left / top right corner
      const cornerX = isHorizontal ? rect.x + rect.width : rect.x;
      const cornerY = isHorizontal ? rect.y : rect.y + rect.height;
      this._addShiftTarget(cornerX, cornerY, boundsSize);

      if (segment) {
        // add targets for each column on bottom / row on right
        const segSpan = Math.round(rect[measure] / segment);
        for (let i = 1; i < segSpan; i++) {
          const segX = isHorizontal ? cornerX : rect.x + segment * i;
          const segY = isHorizontal ? rect.y + segment * i : cornerY;
          this._addShiftTarget(segX, segY, boundsSize);
        }
      }
    });
  }

  private _addShiftTarget(x: number, y: number, boundsSize: number): void {
    const checkCoord = this._getOption('horizontal') ? y : x;
    if (checkCoord !== 0 && checkCoord > boundsSize) {
      return;
    }
    // create string for a key, easier to keep track of what targets
    const key = x + ',' + y;
    const hasKey = this.shiftTargetKeys.indexOf(key) !== -1;
    if (hasKey) {
      return;
    }
    this.shiftTargetKeys.push(key);
    this.shiftTargets.push({ x, y });
  }

  // -------------------------- drop -------------------------- //

  shift(item: PackeryItem, x: number, y: number): void {
    let shiftPosition: ShiftTarget;
    let minDistance = Infinity;
    const position = { x, y };
    this.shiftTargets.forEach((target) => {
      const distance = Packery.getDistance(target, position);
      if (distance < minDistance) {
        shiftPosition = target;
        minDistance = distance;
      }
    });
    item.rect.x = shiftPosition!.x;
    item.rect.y = shiftPosition!.y;
  }

  private static getDistance(a: ShiftTarget, b: ShiftTarget): number {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  // -------------------------- drag move -------------------------- //

  private static DRAG_THROTTLE_TIME = 120;

  /**
   * handle an item drag move event
   */
  itemDragMove(elem: Element, x: number, y: number): void {
    const item = this.isEnabled && (this.getItem(elem) as PackeryItem);
    if (!item) {
      return;
    }

    x -= this.size.paddingLeft;
    y -= this.size.paddingTop;

    const onDrag = () => {
      this.shift(item, x, y);
      item.positionDropPlaceholder();
      this.layout();
    };

    // throttle
    const now = new Date();
    const isThrottled =
      this._itemDragTime &&
      now.getTime() - this._itemDragTime.getTime() < Packery.DRAG_THROTTLE_TIME;

    if (isThrottled) {
      clearTimeout(this.dragTimeout);
      this.dragTimeout = setTimeout(onDrag, Packery.DRAG_THROTTLE_TIME);
    } else {
      onDrag();
      this._itemDragTime = now;
    }
  }

  // -------------------------- drag end -------------------------- //

  /**
   * handle an item drag end event
   */
  itemDragEnd(elem: Element): void {
    const item = this.isEnabled && (this.getItem(elem) as PackeryItem);
    if (!item) {
      return;
    }

    clearTimeout(this.dragTimeout);
    item.element.classList.add('is-positioning-post-drag');

    let completeCount = 0;
    const onDragEndLayoutComplete = () => {
      completeCount++;
      if (completeCount !== 2) {
        return;
      }
      // reset drag item
      item.element.classList.remove('is-positioning-post-drag');
      item.hideDropPlaceholder();
      this.dispatchEvent('dragItemPositioned', undefined, [item]);
    };

    item.once('layout', onDragEndLayoutComplete);
    this.once('layoutComplete', onDragEndLayoutComplete);
    item.moveTo(item.rect.x, item.rect.y);
    this.layout();
    this.dragItemCount = Math.max(0, this.dragItemCount - 1);
    this.sortItemsByPosition();
    item.disablePlacing();
    this.unstamp(item.element);
  }

  /**
   * binds Draggabilly events
   */
  bindDraggabillyEvents(draggie: Draggabilly): void {
    this._bindDraggabillyEvents(draggie, 'on');
  }

  unbindDraggabillyEvents(draggie: Draggabilly): void {
    this._bindDraggabillyEvents(draggie, 'off');
  }

  private _bindDraggabillyEvents(draggie: Draggabilly, method: 'on' | 'off'): void {
    const handlers = this.handleDraggabilly;
    draggie[method]('dragStart', handlers.dragStart);
    draggie[method]('dragMove', handlers.dragMove);
    draggie[method]('dragEnd', handlers.dragEnd);
  }

  /**
   * binds jQuery UI Draggable events
   */
  bindUIDraggableEvents($elems: JQueryDraggable): void {
    this._bindUIDraggableEvents($elems, 'on');
  }

  unbindUIDraggableEvents($elems: JQueryDraggable): void {
    this._bindUIDraggableEvents($elems, 'off');
  }

  private _bindUIDraggableEvents($elems: JQueryDraggable, method: 'on' | 'off'): void {
    const handlers = this.handleUIDraggable;
    $elems[method]('dragstart', handlers.start)
      [method]('drag', handlers.drag)
      [method]('dragstop', handlers.stop);
  }

  // ----- destroy ----- //

  destroy(): void {
    super.destroy();
    // disable flag; prevent drag events from triggering. #72
    this.isEnabled = false;
  }
}
