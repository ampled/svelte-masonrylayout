/*!
 * getSize v3.0.0
 * measure size of elements
 * MIT license
 */

export interface SizeInfo {
  width: number;
  height: number;
  innerWidth: number;
  innerHeight: number;
  outerWidth: number;
  outerHeight: number;
  isBorderBox?: boolean;
  paddingLeft: number;
  paddingRight: number;
  paddingTop: number;
  paddingBottom: number;
  marginLeft: number;
  marginRight: number;
  marginTop: number;
  marginBottom: number;
  borderLeftWidth: number;
  borderRightWidth: number;
  borderTopWidth: number;
  borderBottomWidth: number;
}

// -------------------------- helpers -------------------------- //

// get a number from a string, not a percentage
function getStyleSize(value: string): number | false {
  const num = parseFloat(value);
  // not a percent like '100%', and a number
  const isValid = value.indexOf('%') === -1 && !isNaN(num);
  return isValid && num;
}

// -------------------------- measurements -------------------------- //

const measurements = [
  'paddingLeft',
  'paddingRight',
  'paddingTop',
  'paddingBottom',
  'marginLeft',
  'marginRight',
  'marginTop',
  'marginBottom',
  'borderLeftWidth',
  'borderRightWidth',
  'borderTopWidth',
  'borderBottomWidth',
] as const;

type MeasurementKey = (typeof measurements)[number];

function getZeroSize(): SizeInfo {
  const size: SizeInfo = {
    width: 0,
    height: 0,
    innerWidth: 0,
    innerHeight: 0,
    outerWidth: 0,
    outerHeight: 0,
    paddingLeft: 0,
    paddingRight: 0,
    paddingTop: 0,
    paddingBottom: 0,
    marginLeft: 0,
    marginRight: 0,
    marginTop: 0,
    marginBottom: 0,
    borderLeftWidth: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
    borderBottomWidth: 0,
  };
  return size;
}

// -------------------------- getSize -------------------------- //

export function getSize(elem: string | Element): SizeInfo | undefined {
  // use querySelector if elem is string
  let element: Element | null = elem as Element;
  if (typeof elem === 'string') {
    element = document.querySelector(elem);
  }

  // do not proceed on non-objects
  const isElement = element && typeof element === 'object' && element.nodeType;
  if (!isElement) return;
  if (element == null) return;
  if (!(element instanceof HTMLElement)) return;

  const style = getComputedStyle(element);

  // if hidden, everything is 0
  if (style.display === 'none') return getZeroSize();

  const size: Partial<SizeInfo> = {};
  size.width = element.offsetWidth;
  size.height = element.offsetHeight;

  const isBorderBox = (size.isBorderBox = style.boxSizing === 'border-box');

  // get all measurements
  measurements.forEach((measurement: MeasurementKey) => {
    const value = style[measurement];
    const num = parseFloat(value);
    // any 'auto', 'medium' value will be 0
    size[measurement] = !isNaN(num) ? num : 0;
  });

  const paddingWidth = size.paddingLeft! + size.paddingRight!;
  const paddingHeight = size.paddingTop! + size.paddingBottom!;
  const marginWidth = size.marginLeft! + size.marginRight!;
  const marginHeight = size.marginTop! + size.marginBottom!;
  const borderWidth = size.borderLeftWidth! + size.borderRightWidth!;
  const borderHeight = size.borderTopWidth! + size.borderBottomWidth!;

  // overwrite width and height if we can get it from style
  const styleWidth = getStyleSize(style.width);
  if (styleWidth !== false) {
    size.width =
      styleWidth +
      // add padding and border unless it's already including it
      (isBorderBox ? 0 : paddingWidth + borderWidth);
  }

  const styleHeight = getStyleSize(style.height);
  if (styleHeight !== false) {
    size.height =
      styleHeight +
      // add padding and border unless it's already including it
      (isBorderBox ? 0 : paddingHeight + borderHeight);
  }

  size.innerWidth = size.width! - (paddingWidth + borderWidth);
  size.innerHeight = size.height! - (paddingHeight + borderHeight);

  size.outerWidth = size.width! + marginWidth;
  size.outerHeight = size.height! + marginHeight;

  return size as SizeInfo;
}

export default getSize;
