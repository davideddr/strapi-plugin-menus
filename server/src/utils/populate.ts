import uniq from 'lodash/uniq';

type Populate = unknown;
type Query = Record<string, unknown> & { populate?: Populate };

const ITEMS_WITH_PARENT = ['items', 'items.parent'];

const isPlainObject = (value: unknown): value is Record<string, any> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const toArray = (populate: string | string[]) =>
  (Array.isArray(populate) ? populate : populate.split(','))
    .map((value) => value.trim())
    .filter(Boolean);

/**
 * Adds `parent` to the population of `items`, merged with whatever population
 * the client asked for, so that items can be serialized into a nested tree.
 */
const withItemsParent = (items: unknown): unknown => {
  if (items === undefined || items === true || items === false) {
    return { populate: { parent: true } };
  }

  if (!isPlainObject(items)) {
    return items;
  }

  const itemsPopulate = items.populate;

  // `*` already populates every relation of the menu item, `parent` included.
  if (itemsPopulate === '*') {
    return items;
  }

  if (typeof itemsPopulate === 'string' || Array.isArray(itemsPopulate)) {
    return { ...items, populate: uniq([...toArray(itemsPopulate), 'parent']) };
  }

  if (isPlainObject(itemsPopulate)) {
    return {
      ...items,
      populate: { ...itemsPopulate, parent: itemsPopulate.parent ?? true },
    };
  }

  return { ...items, populate: { parent: true } };
};

/**
 * Returns the query params needed to serialize menu items into a nested tree.
 */
export const getNestedParams = <T extends Query>(params: T): T => {
  const { populate } = params;

  if (populate === undefined || populate === null || populate === '') {
    return { ...params, populate: ITEMS_WITH_PARENT };
  }

  if (populate === '*') {
    return { ...params, populate: ITEMS_WITH_PARENT };
  }

  if (typeof populate === 'string' || Array.isArray(populate)) {
    return {
      ...params,
      populate: uniq([...toArray(populate as string | string[]), ...ITEMS_WITH_PARENT]),
    };
  }

  if (isPlainObject(populate)) {
    return {
      ...params,
      populate: { ...populate, items: withItemsParent(populate.items) },
    };
  }

  return params;
};

/**
 * Whether the client explicitly asked for the `parent` of each menu item. When it
 * did not, `parent` is removed from the nested response.
 */
export const hasParentPopulation = (params: Query): boolean => {
  const { populate } = params;

  if (typeof populate === 'string' || Array.isArray(populate)) {
    return toArray(populate as string | string[]).includes('items.parent');
  }

  if (!isPlainObject(populate) || !isPlainObject(populate.items)) {
    return false;
  }

  const itemsPopulate = populate.items.populate;

  if (itemsPopulate === '*') {
    return true;
  }

  if (typeof itemsPopulate === 'string' || Array.isArray(itemsPopulate)) {
    return toArray(itemsPopulate).includes('parent');
  }

  return isPlainObject(itemsPopulate) && Boolean(itemsPopulate.parent);
};
