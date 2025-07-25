/* eslint-disable @typescript-eslint/no-explicit-any */
/*!
 * Outlayer v2.1.1
 * the brains and guts of a layout library
 * MIT license
 */

import { EvEmitter } from '../ev-emitter.js';
import { getSize, type SizeInfo } from '../get-size.js';
import * as utils from '../utils.js';
import { Item, type Layout, type LayoutOptions, type CSSStyle, type Position } from './item.js';

// declare global {
//   interface Window {
//     jQuery?: JQuery;
//   }
// }

// ----- Types ----- //

export interface OutlayerOptions extends LayoutOptions {
  /**
   * CSS styles that are applied to the container element.
   * @default { position: 'relative' }
   */
  containerStyle?: CSSStyle;
  /**
   * Enables layout on initialization. Enabled by default initLayout: true.
   * Set to `false` to disable layout on initialization, so you can use methods or add events before the initial layout.
   * @default true
   */
  initLayout?: boolean;
  /**
   * Controls the horizontal flow of the layout.
   *
   * Set to `false` for right-to-left layouts.
   * @default true
   */
  originLeft?: boolean;
  /**
   * Controls the vertical flow of the layout.
   *
   * Set to `false` for bottom-up layouts. It’s like Tetris!
   * @default true
   */
  originTop?: boolean;
  /**
   * Adjusts sizes and positions when window is resized.
   *
   * @default true
   */
  resize?: boolean;
  /**
   * @default true
   */
  resizeContainer?: boolean;
  transitionDuration?: string | number;
  hiddenStyle?: CSSStyle;
  visibleStyle?: CSSStyle;
  /**
   * Specifies which child elements will be used as item elements in the layout.
   */
  itemSelector?: string;
  stamp?: string | Element | Element[];
  stagger?: string | number;
  layoutInstant?: boolean;
  /**
   * Aligns items to a horizontal grid.
   *
   * If not set, the outer width of the first item will be used.
   */
  columnWidth?: string | number | Element;
  rowHeight?: string | number | Element;
  /**
   * Adds horizontal space between item elements.
   *
   * Can be a number for pixels, a selector for a gutter sizer element, or an element.
   *
   * To set vertical space between elements, use CSS rule `margin-bottom` on grid items.
   */
  gutter?: string | number | Element;
}

export interface OutlayerDefaults extends OutlayerOptions {
  containerStyle: CSSStyle;
  initLayout: boolean;
  originLeft: boolean;
  originTop: boolean;
  resize: boolean;
  resizeContainer: boolean;
  transitionDuration: string;
  hiddenStyle: CSSStyle;
  visibleStyle: CSSStyle;
}

export interface LayoutPosition {
  item: Item;
  x: number;
  y: number;
  isInstant?: boolean;
}

export interface BoundingRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface ElementOffset {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface OutlayerStatic {
  new (element: string | Element, options?: OutlayerOptions): Outlayer;
  namespace: string;
  defaults: OutlayerOptions;
  compatOptions: Record<string, string>;
  Item: typeof Item;
  data(elem: string | Element): Outlayer | undefined;
  create(namespace: string, options?: Partial<OutlayerOptions>): typeof Outlayer;
}

// ----- Helpers ----- //

// const noop = (): void => {};

// globally unique identifiers
let GUID = 0;
// internal store of all Outlayer instances
const instances = new Map<number, Outlayer>();

// how many milliseconds are in each unit
const msUnits: Record<string, number> = {
  ms: 1,
  s: 1000
};

// munge time-like parameter into millisecond number
// '0.4s' -> 400
function getMilliseconds(time: string | number) {
  if (typeof time === 'number') {
    return time;
  }
  const matches = time.match(/(^\d*\.?\d*)(\w*)/);
  const num = matches && matches[1];
  const unit = matches && matches[2];
  if (!unit) return;
  if (!num || !num.length) {
    return 0;
  }
  const parsedNum = parseFloat(num);
  const mult = msUnits[unit] || 1;
  return parsedNum * mult;
}

// -------------------------- Outlayer -------------------------- //

export class Outlayer extends EvEmitter implements Layout {
  static namespace = 'outlayer';
  static Item = Item;

  // default options
  static defaults: OutlayerDefaults = {
    containerStyle: {
      position: 'relative'
    },
    gutter: 0,
    initLayout: true,
    originLeft: true,
    originTop: true,
    resize: true,
    resizeContainer: true,
    transitionDuration: '0.4s',
    hiddenStyle: {
      opacity: 0,
      transform: 'scale(0.001)'
    },
    visibleStyle: {
      opacity: 1,
      transform: 'scale(1)'
    }
  };

  static compatOptions: Record<string, string> = {
    // currentName: oldName
    initLayout: 'isInitLayout',
    horizontal: 'isHorizontal',
    layoutInstant: 'isLayoutInstant',
    originLeft: 'isOriginLeft',
    originTop: 'isOriginTop',
    resize: 'isResizeBound',
    resizeContainer: 'isResizingContainer'
  };

  // instance properties
  element!: Element;
  options!: OutlayerOptions;
  items: Item[] = [];
  stamps: Element[] = [];
  size!: SizeInfo;
  stagger = 0;

  _isLayoutInited = false;
  _boundingRect!: BoundingRect;
  isResizeBound = false;

  constructor(element: string | Element, options?: OutlayerOptions) {
    super();

    const queryElement = utils.getQueryElement(element);
    if (!queryElement) {
      console.error(
        `Bad element for ${(this.constructor as typeof Outlayer).namespace}: ${queryElement || element}`
      );
      return;
    }

    this.element = queryElement;

    // options
    this.options = utils.extend({}, (this.constructor as typeof Outlayer).defaults);
    this.option(options || {});

    // add id for Outlayer.getFromElement
    const id = ++GUID;

    (this.element as any).outlayerGUID = id; // expando
    instances.set(id, this); // associate via id

    // kick it off
    this._create();

    const isInitLayout = this._getOption('initLayout');
    if (isInitLayout) {
      this.layout();
    }
  }

  /**
   * set options
   */
  option(opts: OutlayerOptions): void {
    this.options = { ...this.options, ...opts };
  }

  /**
   * get backwards compatible option value, check old name
   */
  _getOption(option: string): boolean {
    const Constructor = this.constructor as typeof Outlayer;
    const oldOption = Constructor.compatOptions[option];
    return oldOption && this.options[oldOption as keyof OutlayerOptions] !== undefined
      ? (this.options[oldOption as keyof OutlayerOptions] as boolean)
      : (this.options[option as keyof OutlayerOptions] as boolean);
  }

  _create(): void {
    // get items from children
    this.reloadItems();
    // elements that affect layout, but are not laid out
    this.stamps = [];
    this.stamp(this.options.stamp);
    // set container style
    if (this.options.containerStyle) {
      utils.extend((this.element as HTMLElement).style, this.options.containerStyle);
    }

    // bind resize method
    const canBindResize = this._getOption('resize');
    if (canBindResize) {
      this.bindResize();
    }
  }

  // goes through all children again and gets bricks in proper order
  reloadItems(): void {
    // collection of item elements
    this.items = this._itemize(this.element.children);
  }

  /**
   * turn elements into Outlayer.Items to be used in layout
   */
  _itemize(elems: HTMLCollection | Element[]): Item[] {
    const itemElems = this._filterFindItemElements(elems);
    const ItemClass = (this.constructor as typeof Outlayer).Item;

    // create new Outlayer Items for collection
    const items: Item[] = [];
    for (let i = 0; i < itemElems.length; i++) {
      const elem = itemElems[i];
      (elem as HTMLElement).dataset['masi'] = i.toString();
      const item = new ItemClass(elem, this);
      items.push(item);
    }

    return items;
  }

  /**
   * get item elements to be used in layout
   */
  _filterFindItemElements(elems: HTMLCollection | Element[]): Element[] {
    return utils.filterFindElements(elems, this.options.itemSelector);
  }

  /**
   * getter method for getting item elements
   */
  getItemElements(): Element[] {
    return this.items.map((item) => item.element);
  }

  // ----- init & layout ----- //

  /**
   * lays out all items
   */
  layout(): void {
    this._resetLayout();
    this._manageStamps();

    // don't animate first layout
    const layoutInstant = this.options.layoutInstant;
    const isInstant = layoutInstant !== undefined ? layoutInstant : !this._isLayoutInited;
    this.layoutItems(this.items, isInstant);

    // flag for initialized
    this._isLayoutInited = true;
  }

  // _init is alias for layout
  _init = this.layout;

  /**
   * logic before any new layout
   */
  _resetLayout(): void {
    this.getSize();
  }

  getSize(): void {
    this.size = getSize(this.element)!;
  }

  /**
   * get measurement from option, for columnWidth, rowHeight, gutter
   * if option is String -> get element from selector string, & get size of element
   * if option is Element -> get size of element
   * else use option as a number
   */
  _getMeasurement(measurement: string, size: keyof SizeInfo): void {
    const option = this.options[measurement as keyof OutlayerOptions];
    let elem: Element | null = null;

    if (!option) {
      // default to 0
      (this as any)[measurement] = 0;
    } else {
      // use option as an element
      if (typeof option === 'string') {
        elem = this.element.querySelector(option);
      } else if (option instanceof HTMLElement) {
        elem = option;
      }
      // use size of element, if element
      (this as any)[measurement] = elem ? getSize(elem)?.[size] : option;
    }
  }

  /**
   * layout a collection of item elements
   */
  layoutItems(items: Item[], isInstant?: boolean): void {
    const layoutItems = this._getItemsForLayout(items);
    this._layoutItems(layoutItems, isInstant);
    this._postLayout();
  }

  /**
   * get the items to be laid out
   * you may want to skip over some items
   */
  _getItemsForLayout(items: Item[]): Item[] {
    return items.filter((item) => !(item as any).isIgnored);
  }

  /**
   * layout items
   */
  _layoutItems(items: Item[], isInstant?: boolean): void {
    this._emitCompleteOnItems('layout', items);

    if (!items || !items.length) {
      return;
    }

    const queue: LayoutPosition[] = [];

    items.forEach((item) => {
      // get x/y object from method
      const position = this._getItemLayoutPosition(item);
      if (position) {
        // enqueue
        queue.push({
          item,
          x: position.x,
          y: position.y,
          isInstant: isInstant || (item as any).isLayoutInstant
        });
      }
    });

    this._processLayoutQueue(queue);
  }

  /**
   * get item layout position
   */
  _getItemLayoutPosition(_item: Item): Position | undefined {
    return {
      x: 0,
      y: 0
    };
  }

  /**
   * iterate over array and position each item
   * Reason being - separating this logic prevents 'layout invalidation'
   * thx @paul_irish
   */
  _processLayoutQueue(queue: LayoutPosition[]): void {
    this.updateStagger();
    queue.forEach((obj, i) => {
      this._positionItem(obj.item, obj.x, obj.y, obj.isInstant, i);
    });
  }

  // set stagger from option in milliseconds number
  updateStagger(): number {
    const stagger = this.options.stagger;
    if (stagger === null || stagger === undefined) {
      this.stagger = 0;
      return this.stagger;
    }
    this.stagger = getMilliseconds(stagger) as number;
    return this.stagger;
  }

  /**
   * Sets position of item in DOM
   */
  _positionItem(item: Item, x: number, y: number, isInstant?: boolean, i?: number): void {
    if (isInstant) {
      // if not transition, just set CSS
      item.goTo(x, y);
    } else {
      item.stagger((i || 0) * this.stagger);
      item.moveTo(x, y);
    }
  }

  /**
   * Any logic you want to do after each layout,
   * i.e. size the container
   */
  _postLayout(): void {
    this.resizeContainer();
  }

  resizeContainer(): void {
    const isResizingContainer = this._getOption('resizeContainer');
    if (!isResizingContainer) {
      return;
    }
    const size = this._getContainerSize();
    if (size) {
      this._setContainerMeasure(size.width, true);
      this._setContainerMeasure(size.height, false);
    }
  }

  /**
   * Sets width or height of container if returned
   * @returns size with width and height
   */
  _getContainerSize(): { width?: number; height?: number } | null {
    // Override in subclasses
    return null;
  }

  /**
   * @param measure - size of width or height
   * @param isWidth
   */
  _setContainerMeasure(measure: number | undefined, isWidth: boolean): void {
    if (measure === undefined) {
      return;
    }

    const elemSize = this.size;
    // add padding and border width if border box
    if (elemSize.isBorderBox) {
      measure += isWidth
        ? elemSize.paddingLeft +
          elemSize.paddingRight +
          elemSize.borderLeftWidth +
          elemSize.borderRightWidth
        : elemSize.paddingBottom +
          elemSize.paddingTop +
          elemSize.borderTopWidth +
          elemSize.borderBottomWidth;
    }

    measure = Math.max(measure, 0);
    (this.element as HTMLElement).style[isWidth ? 'width' : 'height'] = measure + 'px';
  }

  /**
   * emit eventComplete on a collection of items events
   */
  _emitCompleteOnItems(eventName: string, items: Item[]): void {
    const onComplete = () => {
      this.dispatchEvent(eventName + 'Complete', undefined, [items]);
    };

    const count = items.length;
    if (!items || !count) {
      onComplete();
      return;
    }

    let doneCount = 0;
    const tick = () => {
      doneCount++;
      if (doneCount === count) {
        onComplete();
      }
    };

    // bind callback
    items.forEach((item) => {
      item.once(eventName, tick);
    });
  }

  /**
   * emits events via EvEmitter and jQuery events
   */
  dispatchEvent(type: string, event?: Event, args?: any[]): void {
    // add original event to arguments
    const emitArgs = event ? [event].concat(args || []) : args || [];
    this.emitEvent(type, emitArgs);
  }

  // -------------------------- ignore & stamps -------------------------- //

  /**
   * keep item in collection, but do not lay it out
   * ignored items do not get skipped in layout
   */
  ignore(elem: Element): void {
    const item = this.getItem(elem);
    if (item) {
      (item as any).isIgnored = true;
    }
  }

  /**
   * return item to layout collection
   */
  unignore(elem: Element): void {
    const item = this.getItem(elem);
    if (item) {
      delete (item as any).isIgnored;
    }
  }

  /**
   * adds elements to stamps
   */
  stamp(elems?: string | Element | Element[]): void {
    const stampElements = this._find(elems);
    if (!stampElements) {
      return;
    }

    this.stamps = this.stamps.concat(stampElements);
    // ignore
    stampElements.forEach((elem) => this.ignore(elem));
  }

  /**
   * removes elements to stamps
   */
  unstamp(elems?: string | Element | Element[]): void {
    const stampElements = this._find(elems);
    if (!stampElements) {
      return;
    }

    stampElements.forEach((elem) => {
      // filter out removed stamp elements
      utils.removeFrom(this.stamps, elem);
      this.unignore(elem);
    });
  }

  /**
   * finds child elements
   */
  _find(elems?: string | Element | Element[]): Element[] | null {
    if (!elems) {
      return null;
    }
    // if string, use argument as selector string
    if (typeof elems === 'string') {
      return [...Array.from(this.element.querySelectorAll(elems))];
    }
    return utils.makeArray(elems);
  }

  _manageStamps(): void {
    if (!this.stamps || !this.stamps.length) {
      return;
    }

    this._getBoundingRect();
    this.stamps.forEach((stamp) => this._manageStamp(stamp));
  }

  // update boundingLeft / Top
  _getBoundingRect(): void {
    // get bounding rect for container element
    const boundingRect = this.element.getBoundingClientRect();
    const size = this.size;
    this._boundingRect = {
      left: boundingRect.left + size.paddingLeft + size.borderLeftWidth,
      top: boundingRect.top + size.paddingTop + size.borderTopWidth,
      right: boundingRect.right - (size.paddingRight + size.borderRightWidth),
      bottom: boundingRect.bottom - (size.paddingBottom + size.borderBottomWidth)
    };
  }

  /**
   * @param stamp
   */
  _manageStamp(_stamp: Element): void {
    // Override in subclasses
  }

  /**
   * get x/y position of element relative to container element
   */
  _getElementOffset(elem: Element): ElementOffset {
    const boundingRect = elem.getBoundingClientRect();
    const thisRect = this._boundingRect;
    const size = getSize(elem)!;
    return {
      left: boundingRect.left - thisRect.left - size.marginLeft,
      top: boundingRect.top - thisRect.top - size.marginTop,
      right: thisRect.right - boundingRect.right - size.marginRight,
      bottom: thisRect.bottom - boundingRect.bottom - size.marginBottom
    };
  }

  // -------------------------- resize -------------------------- //

  // enable event handlers for listeners
  // i.e. resize -> onresize
  handleEvent = utils.handleEvent;

  /**
   * Bind layout to window resizing
   */
  bindResize(): void {
    window.addEventListener('resize', this);
    this.isResizeBound = true;
  }

  /**
   * Unbind layout to window resizing
   */
  unbindResize(): void {
    window.removeEventListener('resize', this);
    this.isResizeBound = false;
  }

  onresize(): void {
    this.resize();
  }

  resize(): void {
    // don't trigger if size did not change
    // or if resize was unbound. See #9
    if (!this.isResizeBound || !this.needsResizeLayout()) {
      return;
    }

    this.layout();
  }

  /**
   * check if layout is needed post layout
   */
  needsResizeLayout(): boolean {
    const size = getSize(this.element);
    // check that this.size and size are there
    // IE8 triggers resize on body size change, so they might not be
    const hasSizes = this.size && size;
    return !!(hasSizes && size.innerWidth !== this.size.innerWidth);
  }

  // -------------------------- methods -------------------------- //

  /**
   * add items to Outlayer instance
   */
  addItems(elems: string | Element | Element[]): Item[] {
    if (typeof elems === 'string') {
      elems = Array.from(document.querySelectorAll(elems));
    }
    const items = this._itemize(utils.makeArray(elems));
    // add items to collection
    if (items.length) {
      this.items = this.items.concat(items);
    }

    return items;
  }

  /**
   * Layout newly-appended item elements
   */
  appended(elems: string | Element | Element[]): void {
    const items = this.addItems(elems);
    if (!items.length) {
      return;
    }
    // layout and reveal just the new items
    this.layoutItems(items, true);
    this.reveal(items);
  }

  /**
   * Layout prepended elements
   */
  prepended(elems: string | Element | Element[]): void {
    if (typeof elems === 'string') {
      elems = Array.from(document.querySelectorAll(elems));
    }
    const items = this._itemize(utils.makeArray(elems));
    if (!items.length) {
      return;
    }
    // add items to beginning of collection
    const previousItems = this.items.slice(0);
    this.items = items.concat(previousItems);
    // start new layout
    this._resetLayout();
    this._manageStamps();
    // layout new stuff without transition
    this.layoutItems(items, true);
    this.reveal(items);
    // layout previous items
    this.layoutItems(previousItems);
  }

  /**
   * reveal a collection of items
   */
  reveal(items: Item[]): void {
    this._emitCompleteOnItems('reveal', items);
    if (!items || !items.length) {
      return;
    }
    const stagger = this.updateStagger();
    items.forEach((item, i) => {
      item.stagger(i * stagger);
      item.reveal();
    });
  }

  /**
   * hide a collection of items
   */
  hide(items: Item[]): void {
    this._emitCompleteOnItems('hide', items);
    if (!items || !items.length) {
      return;
    }
    const stagger = this.updateStagger();
    items.forEach((item, i) => {
      item.stagger(i * stagger);
      item.hide();
    });
  }

  /**
   * reveal item elements
   */
  revealItemElements(elems: string | Element | Element[]): void {
    const items = this.getItems(elems);
    this.reveal(items);
  }

  /**
   * hide item elements
   */
  hideItemElements(elems: string | Element | Element[]): void {
    const items = this.getItems(elems);
    this.hide(items);
  }

  /**
   * get Outlayer.Item, given an Element
   */
  getItem(elem: Element): Item | null {
    // loop through items to get the one that matches
    for (let i = 0; i < this.items.length; i++) {
      const item = this.items[i];
      if (item.element === elem) {
        return item;
      }
    }
    return null;
  }

  /**
   * get collection of Outlayer.Items, given Elements
   */
  getItems(elems: string | Element | Element[]): Item[] {
    if (typeof elems === 'string') {
      elems = Array.from(document.querySelectorAll(elems));
    }
    const elements = utils.makeArray(elems);
    const items: Item[] = [];
    elements.forEach((elem) => {
      const item = this.getItem(elem);
      if (item) {
        items.push(item);
      }
    });

    return items;
  }

  /**
   * remove element(s) from instance and DOM
   */
  remove(elems: string | Element | Element[]): void {
    const removeItems = this.getItems(elems);

    this._emitCompleteOnItems('remove', removeItems);

    // bail if no items to remove
    if (!removeItems || !removeItems.length) {
      return;
    }

    removeItems.forEach((item) => {
      item.remove();
      // remove item from collection
      utils.removeFrom(this.items, item);
    });
  }

  // ----- destroy ----- //

  /**
   * remove and disable Outlayer instance
   */
  destroy(): void {
    // clean up dynamic styles
    const style = (this.element as HTMLElement).style;
    style.height = '';
    style.position = '';
    style.width = '';

    // destroy items
    this.items.forEach((item) => {
      item.destroy();
    });

    this.unbindResize();

    const id = (this.element as any).outlayerGUID;
    instances.delete(id); // remove reference to instance by id
    delete (this.element as any).outlayerGUID;
  }

  // -------------------------- data -------------------------- //

  /**
   * get Outlayer instance from element
   */
  static data(elem: string | Element): Outlayer | undefined {
    const element = utils.getQueryElement(elem);
    const id = element && (element as any).outlayerGUID;
    return id && instances.get(id);
  }

  // -------------------------- create Outlayer class -------------------------- //

  /**
   * create a layout class
   */
  static create(namespace: string, options?: Partial<OutlayerOptions>) {
    // sub-class Outlayer
    class Layout extends Outlayer {
      static namespace = namespace;
      static defaults = utils.extend(Outlayer.defaults, options || {});
      static compatOptions = utils.extend({}, Outlayer.compatOptions);
      static data = Outlayer.data;
      static Item = class extends Item {};

      constructor(elem: string | Element, options?: Partial<OutlayerOptions>) {
        super(elem, options);
      }
    }

    // -------------------------- declarative -------------------------- //
    utils.htmlInit(Layout, namespace);

    // -------------------------- jQuery bridge -------------------------- //
    // const jQuery = window.jQuery;
    // if (jQuery && (jQuery as any).bridget) {
    //   (jQuery as any).bridget(namespace, Layout);
    // }

    return Layout;
  }
}

// add debounce to onresize
utils.debounceMethod(Outlayer, 'onresize', 100);

export default Outlayer;
