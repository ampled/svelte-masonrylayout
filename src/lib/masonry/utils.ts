// import 'jquery';
/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Fizzy UI utils v3.0.0
 * MIT license
 */

import { BROWSER } from 'esm-env';

// ----- Types ----- //

export interface ConstructorWithElement<T = any> {
  new (element: Element, options?: any): T;
}

// export interface JQuery {

//   data(element: Element, key: string, value: any): void;
// }

// declare global {
//   interface Window {
//     jQuery?: JQuery;
//   }
// }

// ----- extend ----- //

/**
 * Extends objects
 */
export function extend<T extends object, U extends object>(a: T, b: U) {
  return Object.assign(a, b);
}

// ----- modulo ----- //

/**
 * Proper modulo operation that handles negative numbers
 */
export function modulo(num: number, div: number): number {
  return ((num % div) + div) % div;
}

// ----- makeArray ----- //

/**
 * Turn element or nodeList into an array
 */
export function makeArray<T>(obj: T | T[] | ArrayLike<T> | null | undefined): T[] {
  // use object if already an array
  if (Array.isArray(obj)) return obj;

  // return empty array if undefined or null. #6
  if (obj === null || obj === undefined) return [];

  const isArrayLike = typeof obj === 'object' && typeof (obj as any).length === 'number';
  // convert nodeList to array
  if (isArrayLike) return [...(obj as unknown as Array<T>)];

  // array of single index
  return [obj as T];
}

// ----- removeFrom ----- //

/**
 * Remove item from array
 */
export function removeFrom<T>(ary: T[], obj: T): void {
  const index = ary.indexOf(obj);
  if (index !== -1) {
    ary.splice(index, 1);
  }
}

// ----- getParent ----- //

/**
 * Get parent element that matches selector
 */
export function getParent(elem: Element, selector: string): Element | null {
  let current = elem;
  while (current.parentNode && current !== document.body) {
    current = current.parentNode as Element;
    if (current.matches && current.matches(selector)) return current;
  }
  return null;
}

// ----- getQueryElement ----- //

/**
 * Use element as selector string
 */
export function getQueryElement(elem: string | Element | null): Element | null {
  if (typeof elem === 'string') {
    return document.querySelector(elem);
  }
  return elem;
}

// ----- handleEvent ----- //

/**
 * Enable .ontype to trigger from .addEventListener( elem, 'type' )
 */
export function handleEvent(this: any, event: Event): void {
  const method = 'on' + event.type;
  if (typeof this[method] === 'function') {
    this[method](event);
  }
}

// ----- filterFindElements ----- //

/**
 * Filter and find elements that match selector
 */
export function filterFindElements(
  elems: Element | Element[] | NodeList | ArrayLike<Element>,
  selector?: string
): Element[] {
  // make array of elems
  const elemArray = makeArray(elems);

  return (
    elemArray
      // check that elem is an actual element
      .filter((elem): elem is Element => elem instanceof HTMLElement)
      .reduce((ffElems: Element[], elem: Element) => {
        // add elem if no selector
        if (!selector) {
          ffElems.push(elem);
          return ffElems;
        }
        // filter & find items if we have a selector
        // filter
        if (elem.matches(selector)) {
          ffElems.push(elem);
        }
        // find children
        const childElems = elem.querySelectorAll(selector);
        // concat childElems to filterFound array
        ffElems = ffElems.concat(...Array.from(childElems));
        return ffElems;
      }, [])
  );
}

// ----- debounceMethod ----- //

/**
 * Debounce method calls
 */
export function debounceMethod<T extends Record<string, any>>(
  _class: new (...args: any[]) => T,
  methodName: keyof T,
  threshold: number = 100
): void {
  // original method
  const method = _class.prototype[methodName];
  const timeoutName = (methodName as string) + 'Timeout';

  _class.prototype[methodName] = function (this: T & Record<string, any>, ...args: any[]) {
    clearTimeout(this[timeoutName]);

    (this as any)[timeoutName] = setTimeout(() => {
      method.apply(this, args);
      delete (this as any)[timeoutName];
    }, threshold);
  };
}

// ----- docReady ----- //

/**
 * Execute callback when DOM is ready
 */
export function docReady(onDocReady: () => void): void {
  const readyState = document.readyState;
  if (readyState === 'complete' || readyState === 'interactive') {
    // do async to allow for other scripts to run. metafizzy/flickity#441
    setTimeout(onDocReady);
  } else {
    document.addEventListener('DOMContentLoaded', onDocReady);
  }
}

// ----- htmlInit ----- //

/**
 * Convert camelCase to dashed-case
 */
export function toDashed(str: string): string {
  return str
    .replace(/(.)([A-Z])/g, (_match, $1, $2) => {
      return $1 + '-' + $2;
    })
    .toLowerCase();
}

/**
 * Allow user to initialize classes via [data-namespace] or .js-namespace class
 * htmlInit( Widget, 'widgetName' )
 * options are parsed from data-namespace-options
 */
export function htmlInit<T>(WidgetClass: ConstructorWithElement<T>, namespace: string): void {
  if (BROWSER)
    docReady(() => {
      const dashedNamespace = toDashed(namespace);
      const dataAttr = 'data-' + dashedNamespace;
      const dataAttrElems = document.querySelectorAll(`[${dataAttr}]`);
      // const jQuery = window.jQuery;

      Array.from(dataAttrElems).forEach((elem) => {
        const attr = elem.getAttribute(dataAttr);
        let options: any;

        try {
          options = attr && JSON.parse(attr);
        } catch (error) {
          // log error, do not initialize
          if (console) {
            console.error(`Error parsing ${dataAttr} on ${elem.className}: ${error}`);
          }
          return;
        }

        // initialize

        new WidgetClass(elem, options);

        // // make available via $().data('namespace')
        // if (jQuery) {
        //   //@ts-expect-error asdf
        //   jQuery.data(elem, namespace, instance);
        // }
      });
    });
}

// ----- Default export ----- //

export default {
  extend,
  modulo,
  makeArray,
  removeFrom,
  getParent,
  getQueryElement,
  handleEvent,
  filterFindElements,
  debounceMethod,
  docReady,
  toDashed,
  htmlInit
};
