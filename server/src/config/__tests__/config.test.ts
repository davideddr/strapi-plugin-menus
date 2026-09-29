import { describe, expect, it } from 'vitest';

import { validateConfig } from '..';

describe('validateConfig', () => {
  it('accepts the default and valid configs', () => {
    expect(() => validateConfig({})).not.toThrow();
    expect(() => validateConfig({ maxDepth: null, layouts: {} })).not.toThrow();
    expect(() =>
      validateConfig({
        maxDepth: 2,
        layouts: {
          menuItem: {
            link: [
              { input: { name: 'icon', type: 'media' }, grid: { col: 6 } },
              { grid: { col: 6 } },
            ],
          },
        },
      })
    ).not.toThrow();
  });

  it('rejects an invalid maxDepth', () => {
    expect(() => validateConfig({ maxDepth: 0 })).toThrow(/maxDepth/);
    expect(() => validateConfig({ maxDepth: 1.5 })).toThrow(/maxDepth/);
  });

  it('rejects invalid layouts', () => {
    expect(() => validateConfig({ layouts: { menuItem: { link: {} as any } } })).toThrow(/array/);
    expect(() => validateConfig({ layouts: { menuItem: { link: [{} as any] } } })).toThrow(/input/);
    expect(() =>
      validateConfig({ layouts: { menuItem: { link: [{ input: { name: 'x' } as any }] } } })
    ).toThrow(/type/);
    expect(() =>
      validateConfig({
        layouts: { menuItem: { link: [{ input: { name: 'x', type: 'customField' } }] } },
      })
    ).toThrow(/customField/);
  });
});
