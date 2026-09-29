import { describe, expect, it, vi } from 'vitest';

vi.mock('@strapi/strapi/admin', () => ({
  translatedErrors: { required: { id: 'required' }, regex: { id: 'regex' } },
}));

import type { MenuEntity, PluginSchema } from '../../types';
import { getMenuItemLayout } from '../fields-layout';
import { createValidationSchema, toCloneValues, toFormValues, toPayload } from '../form';
import { getLayoutFields } from '../fields-layout';

const schema: PluginSchema = {
  menu: {},
  menuItem: {
    order: { type: 'integer' },
    title: { type: 'string', required: true },
    url: { type: 'string' },
    target: { type: 'enumeration', enum: ['_blank', '_parent', '_self', '_top'] },
    root_menu: { type: 'relation', relation: 'manyToOne' },
    parent: { type: 'relation', relation: 'manyToOne' },
    image: { type: 'media', multiple: false },
    article: {
      type: 'relation',
      relation: 'manyToOne',
      metadata: {
        relationType: 'manyToOne',
        targetModel: 'api::article.article',
        mainField: 'name',
      },
    },
    featured: { type: 'boolean' },
    weight: { type: 'integer' },
  },
};

const menu: MenuEntity = {
  id: 1,
  documentId: 'menu',
  title: 'Main',
  slug: 'main',
  items: [
    {
      id: 1,
      documentId: 'a',
      order: 0,
      title: 'Home',
      url: '/',
      target: null,
      parent: null,
      image: { id: 7, url: '/x.png' },
      article: { id: 3, documentId: 'art', name: 'Hello' },
      featured: true,
      weight: 2,
    },
    {
      id: 2,
      documentId: 'b',
      order: 0,
      title: 'Child',
      url: null,
      target: '_blank',
      parent: { id: 1, documentId: 'a' },
    },
  ],
};

describe('form utils', () => {
  it('converts a menu into form values', () => {
    const values = toFormValues(menu, schema);

    expect(values.items[0]).toMatchObject({
      documentId: 'a',
      parent: null,
      article: [{ documentId: 'art', label: 'Hello', id: 3 }],
    });
    expect(values.items[1]).toMatchObject({ parent: 'a', url: '' });
    expect(values.items[0]).not.toHaveProperty('id');
  });

  it('builds the API payload', () => {
    const payload = toPayload(toFormValues(menu, schema), schema);

    expect(payload.items[0]).toEqual({
      documentId: 'a',
      order: 0,
      title: 'Home',
      url: '/',
      target: null,
      parent: null,
      image: 7,
      article: { set: [{ documentId: 'art' }] },
      featured: true,
      weight: 2,
    });
    expect(payload.items[1]).toMatchObject({ documentId: 'b', parent: 'a', url: null });
  });

  it('clones a menu as new items keeping the tree', () => {
    const clone = toCloneValues(toFormValues(menu, schema));
    const [root, child] = clone.items;

    expect(clone.slug).toBe('');
    expect(root.documentId).toBeUndefined();
    expect(root.tempId).toMatch(/^create-/);
    expect(child.parent).toBe(root.tempId);
  });

  it('validates required fields and URLs', async () => {
    const layout = getMenuItemLayout(
      {
        maxDepth: null,
        layouts: {
          menuItem: { link: [{ input: { name: 'image', type: 'media', required: true } }] },
        },
      },
      schema
    );
    const validation = createValidationSchema(getLayoutFields(layout));

    await expect(
      validation.validate({
        title: 'Main',
        slug: 'main',
        items: [{ title: 'Ok', url: 'https://example.com', image: { id: 1 } }],
      })
    ).resolves.toBeTruthy();
    await expect(
      validation.validate({
        title: 'Main',
        slug: 'main',
        items: [{ title: 'Ok', url: 'not a url', image: 1 }],
      })
    ).rejects.toThrow();
    await expect(
      validation.validate({ title: 'Main', slug: 'main', items: [{ title: 'Ok', image: null }] })
    ).rejects.toThrow();
  });

  it('merges custom layouts into tabs', () => {
    const layout = getMenuItemLayout(
      {
        maxDepth: null,
        layouts: {
          menuItem: {
            link: [{ input: { name: 'featured', type: 'bool', label: 'Featured' } }],
            advanced: [{ input: { name: 'target', type: 'select' } }, { grid: { col: 12 } }],
          },
        },
      },
      schema
    );

    expect(layout.map((tab) => tab.name)).toEqual(['link', 'advanced']);
    expect(layout[0].fields.map((field) => field.key)).toEqual([
      'title',
      'url',
      'target',
      'featured',
    ]);
    expect(layout[0].fields[3].input?.label).toEqual({
      id: 'menus.customFields.featured.label',
      defaultMessage: 'Featured',
    });
    expect(layout[1].fields[0].input?.options.map((option) => option.value)).toEqual([
      '_blank',
      '_parent',
      '_self',
      '_top',
    ]);
    expect(layout[1].fields[1]).toEqual({ key: 'spacer-1', grid: { col: 12, s: 12, xs: 12 } });
  });
});
