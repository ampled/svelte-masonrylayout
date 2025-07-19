/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Outlayer Item
 */

import { EvEmitter } from '../ev-emitter';
import { getSize, type SizeInfo } from '../get-size';

// ----- helpers ----- //

function isEmptyObj(obj: Record<string, any>): boolean {
  for (const _prop in obj) {
    return false;
  }
  return true;
}

// -------------------------- CSS3 support -------------------------- //

const docElemStyle = document.documentElement.style;

const transitionProperty =
  typeof docElemStyle.transition === 'string'
    ? 'transition'
    : 'WebkitTransition';
const transformProperty =
  typeof docElemStyle.transform === 'string' ? 'transform' : 'WebkitTransform';

const transitionEndEvent = {
  WebkitTransition: 'webkitTransitionEnd',
  transition: 'transitionend',
}[transitionProperty];

// cache all vendor properties that could have vendor prefix
const vendorProperties: Record<string, string> = {
  transform: transformProperty,
  transition: transitionProperty,
  transitionDuration: transitionProperty + 'Duration',
  transitionProperty: transitionProperty + 'Property',
  transitionDelay: transitionProperty + 'Delay',
};

// -------------------------- Types -------------------------- //

export interface Position {
  x: number;
  y: number;
}

export interface CSSStyle {
  [key: string]: string | number;
}

export interface TransitionArgs {
  to: CSSStyle;
  from?: CSSStyle;
  isCleaning?: boolean;
  onTransitionEnd?: Record<string, () => void>;
}

export interface TransitionState {
  ingProperties: Record<string, boolean>;
  clean: Record<string, boolean>;
  onEnd: Record<string, () => void>;
}

export interface LayoutOptions {
  transitionDuration?: string | number;
  percentPosition?: boolean;
  originLeft?: boolean;
  originTop?: boolean;
  horizontal?: boolean;
  hiddenStyle?: CSSStyle;
  visibleStyle?: CSSStyle;
}

export interface Layout {
  options: LayoutOptions;
  size: SizeInfo;
  _getOption(option: string): boolean;
}

// -------------------------- Item -------------------------- //

export class Item extends EvEmitter {
  element: Element;
  layout: Layout;
  position: Position;
  size?: SizeInfo;
  isTransitioning = false;
  isHidden: boolean | undefined = false;
  staggerDelay = '0ms';

  _transn!: TransitionState;

  constructor(element: Element, layout: Layout) {
    super();

    if (!element) {
      throw new Error('Element is required');
    }

    this.element = element;
    this.layout = layout;
    this.position = {
      x: 0,
      y: 0,
    };

    this._create();
  }

  _create(): void {
    // transition objects
    this._transn = {
      ingProperties: {},
      clean: {},
      onEnd: {},
    };

    this.css({
      position: 'absolute',
    });
  }

  // trigger specified handler for event type
  handleEvent(event: Event): void {
    const method = ('on' + event.type) as keyof this;
    if (typeof this[method] === 'function') {
      (this[method] as (event: Event) => void)(event);
    }
  }

  getSize(): void {
    this.size = getSize(this.element);
  }

  /**
   * apply CSS styles to element
   */
  css(style: CSSStyle): void {
    const elemStyle = (this.element as HTMLElement).style;

    for (const prop in style) {
      // use vendor property if available
      const supportedProp = vendorProperties[prop] || prop;
      elemStyle[supportedProp as any] = style[prop] as string;
    }
  }

  // measure position, and sets it
  getPosition(): void {
    const style = getComputedStyle(this.element);
    const isOriginLeft = this.layout._getOption('originLeft');
    const isOriginTop = this.layout._getOption('originTop');
    const xValue = style[isOriginLeft ? 'left' : 'right'];
    const yValue = style[isOriginTop ? 'top' : 'bottom'];
    let x = parseFloat(xValue);
    let y = parseFloat(yValue);

    // convert percent to pixels
    const layoutSize = this.layout.size;
    if (xValue.indexOf('%') !== -1) {
      x = (x / 100) * layoutSize.width;
    }
    if (yValue.indexOf('%') !== -1) {
      y = (y / 100) * layoutSize.height;
    }

    // clean up 'auto' or other non-integer values
    x = isNaN(x) ? 0 : x;
    y = isNaN(y) ? 0 : y;

    // remove padding from measurement
    x -= isOriginLeft ? layoutSize.paddingLeft : layoutSize.paddingRight;
    y -= isOriginTop ? layoutSize.paddingTop : layoutSize.paddingBottom;

    this.position.x = x;
    this.position.y = y;
  }

  // set settled position, apply padding
  layoutPosition(): void {
    const layoutSize = this.layout.size;
    const style: CSSStyle = {};
    const isOriginLeft = this.layout._getOption('originLeft');
    const isOriginTop = this.layout._getOption('originTop');

    // x
    const xPadding = isOriginLeft ? 'paddingLeft' : 'paddingRight';
    const xProperty = isOriginLeft ? 'left' : 'right';
    const xResetProperty = isOriginLeft ? 'right' : 'left';

    const x = (this.position.x +
      (layoutSize[xPadding as keyof SizeInfo] as number)) as number;
    // set in percentage or pixels
    style[xProperty] = this.getXValue(x);
    // reset other property
    style[xResetProperty] = '';

    // y
    const yPadding = isOriginTop ? 'paddingTop' : 'paddingBottom';
    const yProperty = isOriginTop ? 'top' : 'bottom';
    const yResetProperty = isOriginTop ? 'bottom' : 'top';

    const y = (this.position.y +
      (layoutSize[yPadding as keyof SizeInfo] as number)) as number;
    // set in percentage or pixels
    style[yProperty] = this.getYValue(y);
    // reset other property
    style[yResetProperty] = '';

    this.css(style);
    this.emitEvent('layout', [this]);
  }

  getXValue(x: number): string {
    const isHorizontal = this.layout._getOption('horizontal');
    return this.layout.options.percentPosition && !isHorizontal
      ? (x / this.layout.size.width) * 100 + '%'
      : x + 'px';
  }

  getYValue(y: number): string {
    const isHorizontal = this.layout._getOption('horizontal');
    return this.layout.options.percentPosition && isHorizontal
      ? (y / this.layout.size.height) * 100 + '%'
      : y + 'px';
  }

  _transitionTo(x: number, y: number): void {
    this.getPosition();
    // get current x & y from top/left
    const curX = this.position.x;
    const curY = this.position.y;

    const didNotMove = x === this.position.x && y === this.position.y;

    // save end position
    this.setPosition(x, y);

    // if did not move and not transitioning, just go to layout
    if (didNotMove && !this.isTransitioning) {
      this.layoutPosition();
      return;
    }

    const transX = x - curX;
    const transY = y - curY;
    const transitionStyle: CSSStyle = {};
    transitionStyle.transform = this.getTranslate(transX, transY);

    this.transition({
      to: transitionStyle,
      onTransitionEnd: {
        transform: this.layoutPosition.bind(this),
      },
      isCleaning: true,
    });
  }

  getTranslate(x: number, y: number): string {
    // flip coordinates if origin on right or bottom
    const isOriginLeft = this.layout._getOption('originLeft');
    const isOriginTop = this.layout._getOption('originTop');
    x = isOriginLeft ? x : -x;
    y = isOriginTop ? y : -y;
    return `translate3d(${x}px, ${y}px, 0)`;
  }

  // non transition + transform support
  goTo(x: number, y: number): void {
    this.setPosition(x, y);
    this.layoutPosition();
  }

  moveTo = this._transitionTo.bind(this);

  setPosition(x: number, y: number): void {
    this.position.x = parseFloat(x.toString());
    this.position.y = parseFloat(y.toString());
  }

  // ----- transition ----- //

  // non transition, just trigger callback
  _nonTransition(args: TransitionArgs): void {
    this.css(args.to);
    if (args.isCleaning) {
      this._removeStyles(args.to);
    }
    if (args.onTransitionEnd) {
      for (const prop in args.onTransitionEnd) {
        args.onTransitionEnd[prop].call(this);
      }
    }
  }

  /**
   * proper transition
   */
  transition(args: TransitionArgs): void {
    // redirect to nonTransition if no transition duration
    if (
      !parseFloat(this.layout.options.transitionDuration?.toString() || '0')
    ) {
      this._nonTransition(args);
      return;
    }

    const _transition = this._transn;

    // keep track of onTransitionEnd callback by css property
    if (args.onTransitionEnd) {
      for (const prop in args.onTransitionEnd) {
        _transition.onEnd[prop] = args.onTransitionEnd[prop];
      }
    }

    // keep track of properties that are transitioning
    for (const prop in args.to) {
      _transition.ingProperties[prop] = true;
      // keep track of properties to clean up when transition is done
      if (args.isCleaning) {
        _transition.clean[prop] = true;
      }
    }

    // set from styles
    if (args.from) {
      this.css(args.from);
      // force redraw
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      (this.element as HTMLElement).offsetHeight;
    }

    // enable transition
    this.enableTransition(args.to);
    // set styles that are transitioning
    this.css(args.to);

    this.isTransitioning = true;
  }

  // dash before all cap letters, including first for
  // WebkitTransform => -webkit-transform
  toDashedAll(str: string): string {
    return str.replace(/([A-Z])/g, match => '-' + match.toLowerCase());
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  enableTransition(_style: CSSStyle): void {
    // HACK changing transitionProperty during a transition
    // will cause transition to jump
    if (this.isTransitioning) {
      return;
    }

    const transitionProps = 'opacity,' + this.toDashedAll(transformProperty);

    // munge number to millisecond, to match stagger
    let duration = this.layout.options.transitionDuration;
    duration = typeof duration === 'number' ? duration + 'ms' : duration;

    // enable transition styles
    this.css({
      transitionProperty: transitionProps,
      transitionDuration: duration || '0ms',
      transitionDelay: this.staggerDelay,
    });

    // listen for transition end event
    this.element.addEventListener(transitionEndEvent, this, false);
  }

  // ----- events ----- //

  onwebkitTransitionEnd = (event: TransitionEvent): void => {
    this.ontransitionend(event);
  };

  onotransitionend = (event: TransitionEvent): void => {
    this.ontransitionend(event);
  };

  // properties that I munge to make my life easier
  dashedVendorProperties: Record<string, string> = {
    '-webkit-transform': 'transform',
  };

  ontransitionend(event: TransitionEvent): void {
    // disregard bubbled events from children
    if (event.target !== this.element) {
      return;
    }

    const _transition = this._transn;
    // get property name of transitioned property, convert to prefix-free
    const propertyName =
      this.dashedVendorProperties[event.propertyName] || event.propertyName;

    // remove property that has completed transitioning
    delete _transition.ingProperties[propertyName];

    // check if any properties are still transitioning
    if (isEmptyObj(_transition.ingProperties)) {
      // all properties have completed transitioning
      this.disableTransition();
    }

    // clean style
    if (propertyName in _transition.clean) {
      // clean up style
      (this.element as HTMLElement).style[event.propertyName as any] = '';
      delete _transition.clean[propertyName];
    }

    // trigger onTransitionEnd callback
    if (propertyName in _transition.onEnd) {
      const onTransitionEnd = _transition.onEnd[propertyName];
      onTransitionEnd.call(this);
      delete _transition.onEnd[propertyName];
    }

    this.emitEvent('transitionEnd', [this]);
  }

  disableTransition(): void {
    this.removeTransitionStyles();
    this.element.removeEventListener(transitionEndEvent, this, false);
    this.isTransitioning = false;
  }

  /**
   * removes style property from element
   */
  _removeStyles(style: CSSStyle): void {
    // clean up transition styles
    const cleanStyle: CSSStyle = {};
    for (const prop in style) {
      cleanStyle[prop] = '';
    }
    this.css(cleanStyle);
  }

  removeTransitionStyles(): void {
    // remove transition
    this.css({
      transitionProperty: '',
      transitionDuration: '',
      transitionDelay: '',
    });
  }

  // ----- stagger ----- //

  stagger(delay: number): void {
    const validDelay = isNaN(delay) ? 0 : delay;
    this.staggerDelay = validDelay + 'ms';
  }

  // ----- show/hide/remove ----- //

  // remove element from DOM
  removeElem(): void {
    const parent = this.element.parentNode;
    if (parent) {
      parent.removeChild(this.element);
    }
    // remove display: none
    this.css({ display: '' });
    this.emitEvent('remove', [this]);
  }

  remove(): void {
    // just remove element if no transition support or no transition
    if (
      !transitionProperty ||
      !parseFloat(this.layout.options.transitionDuration?.toString() || '0')
    ) {
      this.removeElem();
      return;
    }

    // start transition
    this.once('transitionEnd', () => {
      this.removeElem();
    });
    this.hide();
  }

  reveal(): void {
    delete this.isHidden;
    // remove display: none
    this.css({ display: '' });

    const options = this.layout.options;

    const onTransitionEnd: Record<string, () => void> = {};
    const transitionEndProperty =
      this.getHideRevealTransitionEndProperty('visibleStyle');
    onTransitionEnd[transitionEndProperty] =
      this.onRevealTransitionEnd.bind(this);

    this.transition({
      from: options.hiddenStyle,
      to: options.visibleStyle ?? {},
      isCleaning: true,
      onTransitionEnd,
    });
  }

  onRevealTransitionEnd(): void {
    // check if still visible
    // during transition, item may have been hidden
    if (!this.isHidden) {
      this.emitEvent('reveal');
    }
  }

  /**
   * get style property use for hide/reveal transition end
   */
  getHideRevealTransitionEndProperty(
    styleProperty: 'hiddenStyle' | 'visibleStyle'
  ): string {
    const optionStyle = this.layout.options[styleProperty];
    if (!optionStyle) return 'opacity';

    // use opacity
    if (optionStyle.opacity !== undefined) {
      return 'opacity';
    }

    // get first property
    for (const prop in optionStyle) {
      return prop;
    }

    return 'opacity';
  }

  hide(): void {
    // set flag
    this.isHidden = true;
    // remove display: none
    this.css({ display: '' });

    const options = this.layout.options;

    const onTransitionEnd: Record<string, () => void> = {};
    const transitionEndProperty =
      this.getHideRevealTransitionEndProperty('hiddenStyle');
    onTransitionEnd[transitionEndProperty] =
      this.onHideTransitionEnd.bind(this);

    this.transition({
      from: options.visibleStyle,
      to: options.hiddenStyle ?? {},
      // keep hidden stuff hidden
      isCleaning: true,
      onTransitionEnd,
    });
  }

  onHideTransitionEnd(): void {
    // check if still hidden
    // during transition, item may have been un-hidden
    if (this.isHidden) {
      this.css({ display: 'none' });
      this.emitEvent('hide');
    }
  }

  destroy(): void {
    this.css({
      position: '',
      left: '',
      right: '',
      top: '',
      bottom: '',
      transition: '',
      transform: '',
    });
  }
}

export default Item;
