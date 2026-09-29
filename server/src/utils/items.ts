import { errors } from '@strapi/utils';

/**
 * Keys of a menu item payload that identify the item or its position in the tree.
 * They are never written as attributes.
 */
const IDENTITY_KEYS = ['id', 'documentId', 'tempId', 'parent', 'root_menu', 'children'];

const TIMESTAMP_KEYS = [
  'createdAt',
  'updatedAt',
  'publishedAt',
  'createdBy',
  'updatedBy',
  'locale',
  'localizations',
];

export interface ExistingItem {
  id: number;
  documentId: string;
}

type ParentInput =
  | null
  | undefined
  | string
  | number
  | { id?: number | string; documentId?: string; tempId?: string }
  | { set?: ParentInput[]; connect?: ParentInput[] };

export interface ItemInput {
  id?: number | string;
  documentId?: string;
  tempId?: string;
  parent?: ParentInput;
  [key: string]: unknown;
}

export interface ItemToSave {
  ref: string;
  documentId?: string;
  parentRef: string | null;
  data: Record<string, unknown>;
}

export interface ItemsSyncPlan {
  toDelete: ExistingItem[];
  toSave: ItemToSave[];
}

const docRef = (documentId: string) => `doc:${documentId}`;
const tempRef = (tempId: string | number) => `tmp:${tempId}`;

const isPlainObject = (value: unknown): value is Record<string, any> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const invalid = (message: string, details?: Record<string, unknown>): never => {
  throw new errors.ValidationError(message, details);
};

/**
 * Computes which menu items must be deleted, created and updated so the menu ends
 * up containing exactly `input`. Items to save are sorted so that every parent is
 * saved before its children, which lets new items reference new parents.
 *
 * An item is identified by its `documentId` (or numeric `id`) when it already
 * belongs to the menu. Otherwise it is a new item, identified by `tempId` or by a
 * non numeric `id` (for example `create-1`), which other items can use as `parent`.
 */
export const planItemsSync = (
  input: ItemInput[],
  existing: ExistingItem[],
  allowedAttributes: string[]
): ItemsSyncPlan => {
  if (!Array.isArray(input)) {
    invalid('`items` must be an array');
  }

  const existingByDocumentId = new Map(existing.map((item) => [item.documentId, item]));
  const existingById = new Map(existing.map((item) => [item.id, item]));

  const resolveExisting = (value: unknown): ExistingItem | undefined => {
    if (typeof value === 'string') {
      return existingByDocumentId.get(value);
    }

    if (typeof value === 'number') {
      return existingById.get(value);
    }

    return undefined;
  };

  const resolveItem = (item: ItemInput, index: number) => {
    if (!isPlainObject(item)) {
      return invalid(`Menu item at index ${index} must be an object`);
    }

    if (item.documentId !== undefined) {
      const match = resolveExisting(item.documentId);

      if (!match) {
        return invalid(`Menu item ${item.documentId} does not belong to this menu`, {
          documentId: item.documentId,
        });
      }

      return { ref: docRef(match.documentId), documentId: match.documentId };
    }

    if (typeof item.id === 'number') {
      const match = resolveExisting(item.id);

      if (!match) {
        return invalid(`Menu item ${item.id} does not belong to this menu`, { id: item.id });
      }

      return { ref: docRef(match.documentId), documentId: match.documentId };
    }

    const tempId = item.tempId ?? item.id ?? `index-${index}`;

    return { ref: tempRef(tempId) };
  };

  const resolveParent = (parent: ParentInput): string | null => {
    if (parent === null || parent === undefined) {
      return null;
    }

    if (typeof parent === 'number') {
      const match = resolveExisting(parent);

      return match ? docRef(match.documentId) : invalid(`Parent menu item ${parent} not found`);
    }

    if (typeof parent === 'string') {
      const match = resolveExisting(parent);

      return match ? docRef(match.documentId) : tempRef(parent);
    }

    if (!isPlainObject(parent)) {
      return invalid('Invalid menu item parent');
    }

    // Relation operations, e.g. `{ set: [{ documentId }] }` or `{ connect: [...] }`.
    if ('set' in parent || 'connect' in parent) {
      const list =
        (parent as { set?: ParentInput[]; connect?: ParentInput[] }).set ??
        (parent as { connect?: ParentInput[] }).connect;

      return Array.isArray(list) && list.length ? resolveParent(list[list.length - 1]) : null;
    }

    const { documentId, id, tempId } = parent as {
      documentId?: string;
      id?: number | string;
      tempId?: string;
    };

    if (documentId !== undefined) {
      return resolveParent(documentId);
    }

    if (typeof id === 'number') {
      return resolveParent(id);
    }

    if (tempId !== undefined || id !== undefined) {
      return tempRef((tempId ?? id) as string);
    }

    return null;
  };

  const pickData = (item: ItemInput) =>
    Object.keys(item).reduce<Record<string, unknown>>((acc, key) => {
      if (
        IDENTITY_KEYS.includes(key) ||
        TIMESTAMP_KEYS.includes(key) ||
        !allowedAttributes.includes(key)
      ) {
        return acc;
      }

      acc[key] = item[key];
      return acc;
    }, {});

  const resolved = input.map((item, index) => ({
    ...resolveItem(item, index),
    parentRef: resolveParent(item.parent),
    data: pickData(item),
  }));

  // Every ref must be unique so that parents can be resolved without ambiguity.
  const byRef = new Map<string, ItemToSave>();

  resolved.forEach((item) => {
    if (byRef.has(item.ref)) {
      invalid(`Duplicated menu item ${item.ref.slice(4)}`);
    }

    byRef.set(item.ref, item);
  });

  resolved.forEach((item) => {
    if (item.parentRef === null) {
      return;
    }

    if (item.parentRef === item.ref) {
      invalid(`Menu item ${item.ref.slice(4)} cannot be its own parent`);
    }

    if (!byRef.has(item.parentRef)) {
      invalid(`Parent menu item ${item.parentRef.slice(4)} is not part of the menu`);
    }
  });

  // Topological sort: parents first. Anything left unsorted is part of a cycle.
  const toSave: ItemToSave[] = [];
  const saved = new Set<string>();
  let pending = resolved;

  while (pending.length) {
    const ready = pending.filter((item) => item.parentRef === null || saved.has(item.parentRef));

    if (!ready.length) {
      invalid('Menu items contain a circular parent relation');
    }

    ready.forEach((item) => {
      toSave.push(item);
      saved.add(item.ref);
    });

    pending = pending.filter((item) => !saved.has(item.ref));
  }

  const keptDocumentIds = new Set(resolved.map((item) => item.documentId).filter(Boolean));
  const toDelete = existing.filter((item) => !keptDocumentIds.has(item.documentId));

  return { toDelete, toSave };
};
