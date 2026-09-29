import type { MenuItemValue } from '../types';

let tempIdCounter = 0;

export const createTempId = () => {
  tempIdCounter += 1;

  return `create-${Date.now().toString(36)}-${tempIdCounter}`;
};

export const getItemKey = (item: Pick<MenuItemValue, 'documentId' | 'tempId'>): string =>
  (item.documentId ?? item.tempId) as string;

const byOrder = (a: MenuItemValue, b: MenuItemValue) => (a.order ?? 0) - (b.order ?? 0);

/**
 * Direct children of the given parent, sorted by `order`. Use `null` for roots.
 */
export const getChildren = (items: MenuItemValue[], parentKey: string | null) =>
  items.filter((item) => (item.parent ?? null) === parentKey).sort(byOrder);

/**
 * Keys of every descendant of the given item.
 */
export const getDescendantKeys = (items: MenuItemValue[], key: string): string[] =>
  getChildren(items, key).flatMap((child) => {
    const childKey = getItemKey(child);

    return [childKey, ...getDescendantKeys(items, childKey)];
  });

/**
 * Depth of an item in the tree, where root items have depth 0.
 */
export const getDepth = (items: MenuItemValue[], key: string): number => {
  let depth = 0;
  let current = items.find((item) => getItemKey(item) === key);
  const visited = new Set<string>();

  while (current?.parent && !visited.has(current.parent)) {
    visited.add(current.parent);
    depth += 1;
    current = items.find((item) => getItemKey(item) === current!.parent);
  }

  return depth;
};

/**
 * Re-numbers `order` of the children of `parentKey` so they are contiguous.
 */
const normalizeOrder = (items: MenuItemValue[], parentKey: string | null) => {
  const orderByKey = new Map(
    getChildren(items, parentKey).map((item, index) => [getItemKey(item), index])
  );

  return items.map((item) => {
    const order = orderByKey.get(getItemKey(item));

    return order === undefined || order === item.order ? item : { ...item, order };
  });
};

export const addItem = (
  items: MenuItemValue[],
  parentKey: string | null,
  defaults: Partial<MenuItemValue> = {}
): { items: MenuItemValue[]; item: MenuItemValue } => {
  const item: MenuItemValue = {
    title: '',
    url: '',
    target: null,
    ...defaults,
    tempId: createTempId(),
    order: getChildren(items, parentKey).length,
    parent: parentKey,
  };

  return { items: [...items, item], item };
};

export const removeItem = (items: MenuItemValue[], key: string) => {
  const item = items.find((_item) => getItemKey(_item) === key);

  if (!item) {
    return items;
  }

  const keysToRemove = new Set([key, ...getDescendantKeys(items, key)]);
  const remaining = items.filter((_item) => !keysToRemove.has(getItemKey(_item)));

  return normalizeOrder(remaining, item.parent ?? null);
};

export const moveItem = (items: MenuItemValue[], key: string, direction: -1 | 1) => {
  const item = items.find((_item) => getItemKey(_item) === key);

  if (!item) {
    return items;
  }

  const siblings = getChildren(items, item.parent ?? null);
  const index = siblings.findIndex((sibling) => getItemKey(sibling) === key);
  const target = siblings[index + direction];

  if (!target) {
    return items;
  }

  const orderByKey = new Map(siblings.map((sibling, i) => [getItemKey(sibling), i]));
  orderByKey.set(key, index + direction);
  orderByKey.set(getItemKey(target), index);

  return items.map((_item) => {
    const order = orderByKey.get(getItemKey(_item));

    return order === undefined ? _item : { ..._item, order };
  });
};

/**
 * Height of the subtree below an item: 0 for a leaf, 1 if it only has children, and so on.
 */
export const getSubtreeHeight = (items: MenuItemValue[], key: string): number =>
  getChildren(items, key).reduce(
    (height, child) => Math.max(height, 1 + getSubtreeHeight(items, getItemKey(child))),
    0
  );

/**
 * Whether an item (with its subtree) can be moved under `newParentKey` (`null` for root)
 * without creating a cycle or exceeding `maxDepth`.
 */
export const canMoveTo = (
  items: MenuItemValue[],
  key: string,
  newParentKey: string | null,
  maxDepth: number | null
): boolean => {
  if (newParentKey !== null) {
    if (newParentKey === key || getDescendantKeys(items, key).includes(newParentKey)) {
      return false;
    }

    if (!items.some((item) => getItemKey(item) === newParentKey)) {
      return false;
    }
  }

  if (maxDepth === null) {
    return true;
  }

  const depth = newParentKey === null ? 0 : getDepth(items, newParentKey) + 1;

  return depth + getSubtreeHeight(items, key) < maxDepth;
};

/**
 * Moves an item (with its subtree) under `newParentKey`, at position `index` among its new
 * siblings, and re-numbers `order` of both the old and the new siblings.
 */
export const moveItemTo = (
  items: MenuItemValue[],
  key: string,
  newParentKey: string | null,
  index: number
): MenuItemValue[] => {
  const item = items.find((_item) => getItemKey(_item) === key);

  if (!item) {
    return items;
  }

  const oldParentKey = item.parent ?? null;
  const siblingKeys = getChildren(items, newParentKey)
    .map(getItemKey)
    .filter((siblingKey) => siblingKey !== key);
  const position = Math.max(0, Math.min(index, siblingKeys.length));

  siblingKeys.splice(position, 0, key);

  const orderByKey = new Map(siblingKeys.map((siblingKey, i) => [siblingKey, i]));
  const moved = items.map((_item) => {
    const _key = getItemKey(_item);
    const order = orderByKey.get(_key);

    if (_key === key) {
      return { ..._item, parent: newParentKey, order: order as number };
    }

    return order === undefined || order === _item.order ? _item : { ..._item, order };
  });

  return oldParentKey === newParentKey ? moved : normalizeOrder(moved, oldParentKey);
};

export type DropPosition = 'before' | 'after' | 'inside';

/**
 * Translates a drop of `dragKey` before/after/inside `targetKey` into the new parent and the
 * index among the new siblings (the dragged item excluded), as expected by `moveItemTo`.
 */
export const getDropTarget = (
  items: MenuItemValue[],
  dragKey: string,
  targetKey: string,
  position: DropPosition
): { parentKey: string | null; index: number } | null => {
  const target = items.find((item) => getItemKey(item) === targetKey);

  if (!target || dragKey === targetKey) {
    return null;
  }

  if (position === 'inside') {
    const children = getChildren(items, targetKey).filter((item) => getItemKey(item) !== dragKey);

    return { parentKey: targetKey, index: children.length };
  }

  const parentKey = target.parent ?? null;
  const siblingKeys = getChildren(items, parentKey)
    .map(getItemKey)
    .filter((key) => key !== dragKey);
  const index = siblingKeys.indexOf(targetKey);

  return { parentKey, index: position === 'before' ? index : index + 1 };
};
