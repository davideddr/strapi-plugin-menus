import { describe, expect, it } from 'vitest';

import { serializeNested } from '../nested';

// Responses are loosely typed, as they would be in a controller.
const nest = (response: any, keepParent?: boolean): any => serializeNested(response, keepParent);

const flatMenu = {
  id: 1,
  documentId: 'menu',
  title: 'Main',
  items: [
    { id: 3, documentId: 'c', title: 'Child', order: 0, parent: { id: 1, documentId: 'a' } },
    { id: 2, documentId: 'b', title: 'Second', order: 1, parent: null },
    { id: 1, documentId: 'a', title: 'First', order: 0, parent: null },
    { id: 4, documentId: 'd', title: 'Grandchild', order: 0, parent: { id: 3, documentId: 'c' } },
  ],
};

describe('serializeNested', () => {
  it('nests flat Strapi 5 items by parent, sorted by order', () => {
    const { data } = nest({ data: flatMenu, meta: {} });

    expect(data.items.map((item: any) => item.title)).toEqual(['First', 'Second']);
    expect(data.items[0].children[0].title).toBe('Child');
    expect(data.items[0].children[0].children[0].title).toBe('Grandchild');
    expect(data.items[1].children).toEqual([]);
  });

  it('removes `parent` unless asked to keep it', () => {
    const removed = nest({ data: flatMenu });
    const kept = nest({ data: flatMenu }, true);

    expect(removed.data.items[0]).not.toHaveProperty('parent');
    expect(kept.data.items[0].children[0].parent).toEqual({ id: 1, documentId: 'a' });
  });

  it('serializes lists of menus', () => {
    const { data } = nest({ data: [flatMenu, { ...flatMenu, id: 2 }] });

    expect(data).toHaveLength(2);
    expect(data[1].items).toHaveLength(2);
  });

  it('nests Strapi 4 formatted responses', () => {
    const v4Menu = {
      id: 1,
      attributes: {
        title: 'Main',
        items: {
          data: [
            { id: 1, attributes: { title: 'First', order: 0, parent: { data: null } } },
            {
              id: 2,
              attributes: { title: 'Child', order: 0, parent: { data: { id: 1, attributes: {} } } },
            },
          ],
        },
      },
    };

    const { data } = nest({ data: v4Menu });
    const [root] = data.attributes.items.data;

    expect(data.attributes.items.data).toHaveLength(1);
    expect(root.attributes).not.toHaveProperty('parent');
    expect(root.attributes.children.data[0].attributes.title).toBe('Child');
    expect(root.attributes.children.data[0].attributes.children.data).toEqual([]);
  });

  it('treats items with a missing parent as roots and survives cycles', () => {
    const { data } = nest({
      data: {
        items: [
          { id: 1, order: 0, parent: { id: 99 } },
          { id: 2, order: 0, parent: { id: 3 } },
          { id: 3, order: 1, parent: { id: 2 } },
        ],
      },
    });

    expect(data.items.map((item: any) => item.id)).toEqual([1]);
  });

  it('returns entities without items unchanged', () => {
    const response = { data: { id: 1, title: 'Empty' } };

    expect(nest(response)).toEqual(response);
    expect(nest({ data: null })).toEqual({ data: null });
  });
});
