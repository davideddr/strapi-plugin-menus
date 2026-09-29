import { describe, expect, it } from 'vitest';

import type { MenuItemValue } from '../../types';
import {
  addItem,
  canMoveTo,
  getChildren,
  getDepth,
  getDescendantKeys,
  getDropTarget,
  getItemKey,
  getSubtreeHeight,
  moveItem,
  moveItemTo,
  removeItem,
} from '../tree';

const item = (key: string, parent: string | null, order: number): MenuItemValue => ({
  documentId: key,
  title: key,
  url: '',
  target: null,
  parent,
  order,
});

const items = [
  item('b', null, 1),
  item('a', null, 0),
  item('a1', 'a', 0),
  item('a2', 'a', 1),
  item('a1x', 'a1', 0),
];

describe('tree utils', () => {
  it('returns children sorted by order', () => {
    expect(getChildren(items, null).map(getItemKey)).toEqual(['a', 'b']);
    expect(getChildren(items, 'a').map(getItemKey)).toEqual(['a1', 'a2']);
  });

  it('returns descendants and depth', () => {
    expect(getDescendantKeys(items, 'a')).toEqual(['a1', 'a1x', 'a2']);
    expect(getDepth(items, 'a')).toBe(0);
    expect(getDepth(items, 'a1x')).toBe(2);
  });

  it('adds an item at the end of its siblings', () => {
    const { items: next, item: added } = addItem(items, 'a');

    expect(added.tempId).toMatch(/^create-/);
    expect(added.order).toBe(2);
    expect(getChildren(next, 'a').map(getItemKey)).toEqual(['a1', 'a2', added.tempId]);
  });

  it('removes an item with its descendants and re-numbers siblings', () => {
    const next = removeItem(items, 'a1');

    expect(next.map(getItemKey)).toEqual(['b', 'a', 'a2']);
    expect(next.find((i) => i.documentId === 'a2')?.order).toBe(0);
  });

  it('moves an item among its siblings', () => {
    const next = moveItem(items, 'b', -1);

    expect(getChildren(next, null).map(getItemKey)).toEqual(['b', 'a']);
    expect(moveItem(items, 'a', -1)).toBe(items);
  });

  it('returns the height of a subtree', () => {
    expect(getSubtreeHeight(items, 'a')).toBe(2);
    expect(getSubtreeHeight(items, 'a1')).toBe(1);
    expect(getSubtreeHeight(items, 'b')).toBe(0);
  });

  it('refuses to move an item inside itself or one of its descendants', () => {
    expect(canMoveTo(items, 'a', 'a', null)).toBe(false);
    expect(canMoveTo(items, 'a', 'a1', null)).toBe(false);
    expect(canMoveTo(items, 'a', 'a1x', null)).toBe(false);
    expect(canMoveTo(items, 'a', 'missing', null)).toBe(false);
    expect(canMoveTo(items, 'a', 'b', null)).toBe(true);
    expect(canMoveTo(items, 'a1', null, null)).toBe(true);
  });

  it('refuses to move an item beyond maxDepth', () => {
    // 'a' has a subtree of height 2: under 'b' its deepest item would be at depth 3.
    expect(canMoveTo(items, 'a', 'b', 3)).toBe(false);
    expect(canMoveTo(items, 'a', 'b', 4)).toBe(true);
    expect(canMoveTo(items, 'a1', 'b', 3)).toBe(true);
    expect(canMoveTo(items, 'a1x', 'a', 2)).toBe(true);
    expect(canMoveTo(items, 'a1x', 'a2', 2)).toBe(false);
    expect(canMoveTo(items, 'a', null, 2)).toBe(false);
  });

  it('reorders an item among its siblings with contiguous order', () => {
    const next = moveItemTo(items, 'a2', 'a', 0);

    expect(getChildren(next, 'a').map(getItemKey)).toEqual(['a2', 'a1']);
    expect(getChildren(next, 'a').map((i) => i.order)).toEqual([0, 1]);
  });

  it('moves an item under another parent and re-numbers both levels', () => {
    const next = moveItemTo(items, 'a1', null, 1);

    expect(getChildren(next, null).map(getItemKey)).toEqual(['a', 'a1', 'b']);
    expect(getChildren(next, null).map((i) => i.order)).toEqual([0, 1, 2]);
    expect(getChildren(next, 'a').map(getItemKey)).toEqual(['a2']);
    expect(next.find((i) => i.documentId === 'a2')?.order).toBe(0);
    // Descendants follow their parent.
    expect(getChildren(next, 'a1').map(getItemKey)).toEqual(['a1x']);
    expect(getDepth(next, 'a1x')).toBe(1);
  });

  it('clamps the target index', () => {
    const next = moveItemTo(items, 'b', 'a', 99);

    expect(getChildren(next, 'a').map(getItemKey)).toEqual(['a1', 'a2', 'b']);
    expect(moveItemTo(items, 'missing', null, 0)).toBe(items);
  });

  it('translates a drop position into parent and index', () => {
    expect(getDropTarget(items, 'b', 'a', 'before')).toEqual({ parentKey: null, index: 0 });
    expect(getDropTarget(items, 'a', 'b', 'after')).toEqual({ parentKey: null, index: 1 });
    expect(getDropTarget(items, 'a2', 'a1', 'after')).toEqual({ parentKey: 'a', index: 1 });
    expect(getDropTarget(items, 'b', 'a', 'inside')).toEqual({ parentKey: 'a', index: 2 });
    expect(getDropTarget(items, 'a1', 'a', 'inside')).toEqual({ parentKey: 'a', index: 1 });
    expect(getDropTarget(items, 'a', 'a', 'inside')).toBeNull();
  });
});
