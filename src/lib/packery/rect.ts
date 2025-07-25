/**
 * Rect
 * low-level utility class for basic geometry
 */

export interface RectProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

export class Rect {
  x: number;
  y: number;
  width: number;
  height: number;

  static defaults: RectProps = {
    x: 0,
    y: 0,
    width: 0,
    height: 0
  };

  constructor(props: RectProps = {}) {
    // extend properties from defaults
    this.x = props.x ?? Rect.defaults.x!;
    this.y = props.y ?? Rect.defaults.y!;
    this.width = props.width ?? Rect.defaults.width!;
    this.height = props.height ?? Rect.defaults.height!;
  }

  /**
   * Determines whether or not this rectangle wholly encloses another rectangle or point.
   */
  contains(rect: RectProps): boolean {
    // points don't have width or height
    const otherWidth = rect.width || 0;
    const otherHeight = rect.height || 0;
    return (
      this.x <= (rect.x || 0) &&
      this.y <= (rect.y || 0) &&
      this.x + this.width >= (rect.x || 0) + otherWidth &&
      this.y + this.height >= (rect.y || 0) + otherHeight
    );
  }

  /**
   * Determines whether or not the rectangle intersects with another.
   */
  overlaps(rect: RectProps): boolean {
    const thisRight = this.x + this.width;
    const thisBottom = this.y + this.height;
    const rectRight = (rect.x || 0) + (rect.width || 0);
    const rectBottom = (rect.y || 0) + (rect.height || 0);

    // http://stackoverflow.com/a/306332
    return (
      this.x < rectRight &&
      thisRight > (rect.x || 0) &&
      this.y < rectBottom &&
      thisBottom > (rect.y || 0)
    );
  }

  /**
   * @param rect - the overlapping rect
   * @returns freeRects - rects representing the area around the rect
   */
  getMaximalFreeRects(rect: RectProps): Rect[] | false {
    // if no intersection, return false
    if (!this.overlaps(rect)) {
      return false;
    }

    const freeRects: Rect[] = [];
    const thisRight = this.x + this.width;
    const thisBottom = this.y + this.height;
    const rectRight = (rect.x || 0) + (rect.width || 0);
    const rectBottom = (rect.y || 0) + (rect.height || 0);

    // top
    if (this.y < (rect.y || 0)) {
      const freeRect = new Rect({
        x: this.x,
        y: this.y,
        width: this.width,
        height: (rect.y || 0) - this.y
      });
      freeRects.push(freeRect);
    }

    // right
    if (thisRight > rectRight) {
      const freeRect = new Rect({
        x: rectRight,
        y: this.y,
        width: thisRight - rectRight,
        height: this.height
      });
      freeRects.push(freeRect);
    }

    // bottom
    if (thisBottom > rectBottom) {
      const freeRect = new Rect({
        x: this.x,
        y: rectBottom,
        width: this.width,
        height: thisBottom - rectBottom
      });
      freeRects.push(freeRect);
    }

    // left
    if (this.x < (rect.x || 0)) {
      const freeRect = new Rect({
        x: this.x,
        y: this.y,
        width: (rect.x || 0) - this.x,
        height: this.height
      });
      freeRects.push(freeRect);
    }

    return freeRects;
  }

  canFit(rect: RectProps): boolean {
    return this.width >= (rect.width || 0) && this.height >= (rect.height || 0);
  }
}

export default Rect;
