/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Packery Item Element
 */

import { Item as OutlayerItem, type Layout } from '../masonry/outlayer/item.js';
import { Rect } from './rect.js';

// -------------------------- Types -------------------------- //

export interface PackeryLayout extends Layout {
  dragItemCount?: number;
  packer: {
    addSpace(rect: Rect): void;
  };
  _setRectSize(element: Element, rect: Rect): void;
}

// -------------------------- Item -------------------------- //

const docElemStyle = document.documentElement.style;

const transformProperty =
  typeof docElemStyle.transform === 'string' ? 'transform' : 'WebkitTransform';

// sub-class Item
export class PackeryItem extends OutlayerItem {
  rect!: Rect;
  isPlacing = false;
  dropPlaceholder?: HTMLElement;

  declare layout: PackeryLayout;

  _create(): void {
    // call default _create logic
    super._create();
    this.rect = new Rect();
  }

  override moveTo(x: number, y: number): void {
    // don't shift 1px while dragging
    const dx = Math.abs(this.position.x - x);
    const dy = Math.abs(this.position.y - y);

    const canHackGoTo =
      this.layout.dragItemCount && !this.isPlacing && !this.isTransitioning && dx < 1 && dy < 1;

    if (canHackGoTo) {
      this.goTo(x, y);
      return;
    }

    super.moveTo(x, y);
  }

  // -------------------------- placing -------------------------- //

  enablePlacing(): void {
    this.removeTransitionStyles();
    // remove transform property from transition
    if (this.isTransitioning && transformProperty) {
      (this.element as HTMLElement).style[transformProperty as any] = 'none';
    }
    this.isTransitioning = false;
    this.getSize();
    this.layout._setRectSize(this.element, this.rect);
    this.isPlacing = true;
  }

  disablePlacing(): void {
    this.isPlacing = false;
  }

  // remove element from DOM
  removeElem(): void {
    const parent = this.element.parentNode;
    if (parent) {
      parent.removeChild(this.element);
    }
    // add space back to packer
    this.layout.packer.addSpace(this.rect);
    this.emitEvent('remove', [this]);
  }

  // ----- dropPlaceholder ----- //

  showDropPlaceholder(): void {
    let dropPlaceholder = this.dropPlaceholder;
    if (!dropPlaceholder) {
      // create dropPlaceholder
      dropPlaceholder = this.dropPlaceholder = document.createElement('div');
      dropPlaceholder.className = 'packery-drop-placeholder';
      dropPlaceholder.style.position = 'absolute';
    }

    if (this.size) {
      dropPlaceholder.style.width = this.size.width + 'px';
      dropPlaceholder.style.height = this.size.height + 'px';
    }

    this.positionDropPlaceholder();
    (this.layout as any).element.appendChild(dropPlaceholder);
  }

  positionDropPlaceholder(): void {
    if (this.dropPlaceholder) {
      this.dropPlaceholder.style[transformProperty as any] =
        `translate(${this.rect.x}px, ${this.rect.y}px)`;
    }
  }

  hideDropPlaceholder(): void {
    // only remove once, #333
    if (this.dropPlaceholder) {
      const parent = this.dropPlaceholder.parentNode;
      if (parent) {
        parent.removeChild(this.dropPlaceholder);
      }
    }
  }
}

export default PackeryItem;
