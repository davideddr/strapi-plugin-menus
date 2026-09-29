import { describe, expect, it } from 'vitest';

import { planItemsSync } from '../items';

const existing = [
  { id: 1, documentId: 'a' },
  { id: 2, documentId: 'b' },
  { id: 3, documentId: 'c' },
];

const attributes = ['order', 'title', 'url', 'target', 'image'];

describe('planItemsSync', () => {
  it('deletes existing items missing from the payload', () => {
    const { toDelete } = planItemsSync([{ documentId: 'a', title: 'A' }], existing, attributes);

    expect(toDelete.map((item) => item.documentId)).toEqual(['b', 'c']);
  });

  it('saves parents before their children, including new ones', () => {
    const { toSave } = planItemsSync(
      [
        { tempId: 'create-2', title: 'Grandchild', parent: 'create-1' },
        { tempId: 'create-1', title: 'Child', parent: { documentId: 'a' } },
        { documentId: 'a', title: 'Root', parent: null },
      ],
      existing,
      attributes
    );

    expect(toSave.map((item) => item.data.title)).toEqual(['Root', 'Child', 'Grandchild']);
    expect(toSave[1].parentRef).toBe('doc:a');
    expect(toSave[2].parentRef).toBe('tmp:create-1');
  });

  it('supports the legacy `id` format of the v4 plugin', () => {
    const { toSave } = planItemsSync(
      [
        { id: 1, title: 'Root' },
        { id: 'create1', title: 'New', parent: { id: 1 } },
        { id: 'create2', title: 'Newer', parent: { id: 'create1' } },
      ],
      existing,
      attributes
    );

    expect(toSave.map((item) => [item.ref, item.parentRef])).toEqual([
      ['doc:a', null],
      ['tmp:create1', 'doc:a'],
      ['tmp:create2', 'tmp:create1'],
    ]);
  });

  it('only keeps writable attributes', () => {
    const { toSave } = planItemsSync(
      [{ documentId: 'a', title: 'A', createdAt: 'x', root_menu: 'other', unknown: 1, image: 5 }],
      existing,
      attributes
    );

    expect(toSave[0].data).toEqual({ title: 'A', image: 5 });
  });

  it('resolves relation operations used as parent', () => {
    const { toSave } = planItemsSync(
      [
        { documentId: 'a', title: 'A' },
        { documentId: 'b', title: 'B', parent: { set: [{ documentId: 'a' }] } },
        { documentId: 'c', title: 'C', parent: { connect: [] } },
      ],
      existing,
      attributes
    );

    expect(toSave.find((item) => item.documentId === 'b')?.parentRef).toBe('doc:a');
    expect(toSave.find((item) => item.documentId === 'c')?.parentRef).toBeNull();
  });

  it('rejects items of other menus, unknown parents and cycles', () => {
    expect(() => planItemsSync([{ documentId: 'z' }], existing, attributes)).toThrow(
      /does not belong/
    );
    expect(() => planItemsSync([{ tempId: 'x', parent: 'missing' }], existing, attributes)).toThrow(
      /not part of the menu/
    );
    expect(() =>
      planItemsSync(
        [
          { documentId: 'a', parent: 'b' },
          { documentId: 'b', parent: 'a' },
        ],
        existing,
        attributes
      )
    ).toThrow(/circular/);
    expect(() => planItemsSync([{ tempId: 'x' }, { tempId: 'x' }], existing, attributes)).toThrow(
      /Duplicated/
    );
  });
});
