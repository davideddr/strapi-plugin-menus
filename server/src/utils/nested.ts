type Entity = Record<string, any>;

const isPlainObject = (value: unknown): value is Entity =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const byOrder = (a: Entity, b: Entity, getOrder: (item: Entity) => unknown) => {
  const orderA = Number(getOrder(a) ?? 0);
  const orderB = Number(getOrder(b) ?? 0);

  return orderA - orderB;
};

interface Shape {
  getItems: (entity: Entity) => Entity[] | undefined;
  getParentId: (item: Entity) => string | number | undefined;
  getOrder: (item: Entity) => unknown;
  build: (item: Entity, children: Entity[], keepParent: boolean) => Entity;
  setItems: (entity: Entity, items: Entity[]) => Entity;
}

/**
 * Default Strapi 5 response: `{ documentId, title, items: [{ documentId, parent }] }`.
 */
const flatShape: Shape = {
  getItems: (entity) => (Array.isArray(entity.items) ? entity.items : undefined),
  getParentId: (item) => (isPlainObject(item.parent) ? item.parent.id : undefined),
  getOrder: (item) => item.order,
  build: (item, children, keepParent) => {
    const { parent, ...rest } = item;

    return keepParent ? { ...rest, parent, children } : { ...rest, children };
  },
  setItems: (entity, items) => ({ ...entity, items }),
};

/**
 * Strapi 4 response, returned with the `Strapi-Response-Format: v4` header:
 * `{ id, attributes: { items: { data: [{ id, attributes: { parent: { data } } }] } } }`.
 */
const v4Shape: Shape = {
  getItems: (entity) => {
    const data = entity.attributes?.items?.data;

    return Array.isArray(data) ? data : undefined;
  },
  getParentId: (item) => {
    const parent = item.attributes?.parent?.data;

    return isPlainObject(parent) ? parent.id : undefined;
  },
  getOrder: (item) => item.attributes?.order,
  build: (item, children, keepParent) => {
    const { parent, ...attributes } = item.attributes ?? {};

    return {
      ...item,
      attributes: keepParent
        ? { ...attributes, parent, children: { data: children } }
        : { ...attributes, children: { data: children } },
    };
  },
  setItems: (entity, items) => ({
    ...entity,
    attributes: {
      ...entity.attributes,
      items: { ...entity.attributes.items, data: items },
    },
  }),
};

const serializeEntity = (entity: unknown, keepParent: boolean): unknown => {
  if (!isPlainObject(entity)) {
    return entity;
  }

  const shape = isPlainObject(entity.attributes) ? v4Shape : flatShape;
  const items = shape.getItems(entity);

  if (!items?.length) {
    return entity;
  }

  const ids = new Set(items.map((item) => item.id));
  const childrenByParent = new Map<string | number, Entity[]>();
  const roots: Entity[] = [];

  items.forEach((item) => {
    const parentId = shape.getParentId(item);

    // Items whose parent is missing from the menu are treated as root items.
    if (parentId === undefined || !ids.has(parentId)) {
      roots.push(item);
      return;
    }

    const siblings = childrenByParent.get(parentId) ?? [];
    siblings.push(item);
    childrenByParent.set(parentId, siblings);
  });

  const visited = new Set<string | number>();

  const buildTree = (list: Entity[]): Entity[] =>
    [...list]
      .sort((a, b) => byOrder(a, b, shape.getOrder))
      .filter((item) => {
        // Guard against circular parent relations.
        if (visited.has(item.id)) {
          return false;
        }

        visited.add(item.id);
        return true;
      })
      .map((item) => shape.build(item, buildTree(childrenByParent.get(item.id) ?? []), keepParent));

  return shape.setItems(entity, buildTree(roots));
};

/**
 * Serializes the menu items of a `{ data, meta }` response into a nested tree,
 * where each item has its sub items in `children`.
 */
export const serializeNested = <T extends { data?: unknown }>(
  response: T,
  keepParent = false
): T => {
  if (!isPlainObject(response)) {
    return response;
  }

  const { data } = response;

  return {
    ...response,
    data: Array.isArray(data)
      ? data.map((entity) => serializeEntity(entity, keepParent))
      : serializeEntity(data, keepParent),
  };
};
