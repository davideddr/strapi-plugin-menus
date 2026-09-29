import { describe, expect, it } from 'vitest';

import { getNestedParams, hasParentPopulation } from '../populate';

describe('getNestedParams', () => {
  it('populates items and their parent by default', () => {
    expect(getNestedParams({})).toEqual({ populate: ['items', 'items.parent'] });
    expect(getNestedParams({ populate: '*' })).toEqual({ populate: ['items', 'items.parent'] });
  });

  it('merges string and array populations', () => {
    expect(getNestedParams({ populate: 'items.image' }).populate).toEqual([
      'items.image',
      'items',
      'items.parent',
    ]);
    expect(getNestedParams({ populate: ['items', 'items.parent'] }).populate).toEqual([
      'items',
      'items.parent',
    ]);
  });

  it('adds parent to object populations of items', () => {
    expect(getNestedParams({ populate: { items: true } }).populate).toEqual({
      items: { populate: { parent: true } },
    });
    expect(getNestedParams({ populate: { items: { populate: ['image'] } } }).populate).toEqual({
      items: { populate: ['image', 'parent'] },
    });
    expect(
      getNestedParams({ populate: { items: { fields: ['title'], populate: { image: true } } } })
        .populate
    ).toEqual({ items: { fields: ['title'], populate: { image: true, parent: true } } });
    expect(getNestedParams({ populate: { items: { populate: '*' } } }).populate).toEqual({
      items: { populate: '*' },
    });
  });

  it('keeps other query params', () => {
    expect(getNestedParams({ filters: { slug: 'main' } })).toEqual({
      filters: { slug: 'main' },
      populate: ['items', 'items.parent'],
    });
  });
});

describe('hasParentPopulation', () => {
  it('detects an explicit parent population', () => {
    expect(hasParentPopulation({ populate: ['items', 'items.parent'] })).toBe(true);
    expect(hasParentPopulation({ populate: 'items,items.parent' })).toBe(true);
    expect(hasParentPopulation({ populate: { items: { populate: ['parent'] } } })).toBe(true);
    expect(hasParentPopulation({ populate: { items: { populate: { parent: true } } } })).toBe(true);
    expect(hasParentPopulation({ populate: { items: { populate: '*' } } })).toBe(true);
  });

  it('returns false otherwise', () => {
    expect(hasParentPopulation({})).toBe(false);
    expect(hasParentPopulation({ populate: '*' })).toBe(false);
    expect(hasParentPopulation({ populate: ['items'] })).toBe(false);
    expect(hasParentPopulation({ populate: { items: true } })).toBe(false);
  });
});
