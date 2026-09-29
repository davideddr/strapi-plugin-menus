# Strapi Menus

A Strapi 5 plugin to build and manage nested menus and menu items, with a tree editor in the admin panel and a REST API ready to render navigation in any frontend.

This package is a rewrite for Strapi 5 of [`strapi-plugin-menus`](https://github.com/mattmilburn/strapi-plugin-menus) by Matt Milburn, which only supports Strapi 4. It keeps the same plugin id, content types and configuration, so it can replace it as is. See [MIGRATION.md](./MIGRATION.md).

- [Features](#features)
- [Requirements](#requirements)
- [Installation](#installation)
- [Configuration](#configuration)
- [Permissions](#permissions)
- [Extending menu items](#extending-menu-items)
- [API usage](#api-usage)
- [Documentation plugin](#documentation-plugin)
- [Development](#development)

## Features

- Create, edit, clone and delete menus from the admin panel.
- Nested menu items with a configurable maximum depth.
- Drag and drop to reorder menu items or move them under another parent (move up/down buttons are still available).
- `title`, `url` and link `target` for every menu item.
- Custom menu item attributes and form layouts: text, numbers, booleans, dates, enumerations, JSON, media, relations and custom fields.
- Consumable REST API with an optional nested output.
- Admin RBAC permissions.

## Requirements

- Strapi `^5.0.0`
- Node.js `>=20 <=26` (tested on 22 and 24 LTS)

## Installation

```bash
npm install @davideddr/strapi-plugin-menus
```

Then enable the plugin and rebuild the admin panel:

```ts
// config/plugins.ts
export default () => ({
  menus: {
    enabled: true,
  },
});
```

```bash
npm run build
```

## Configuration

| Property   | Type (default)    | Description                                        |
| ---------- | ----------------- | -------------------------------------------------- |
| `maxDepth` | `number` (`null`) | Limits how deep menu items can be nested.          |
| `layouts`  | `object` (`{}`)   | Form layouts for custom menu item attributes.      |

```ts
// config/plugins.ts
export default () => ({
  menus: {
    enabled: true,
    config: {
      maxDepth: 3,
      layouts: {
        menuItem: {
          link: [
            {
              input: { name: 'icon', type: 'media', label: 'Icon' },
              grid: { col: 6 },
            },
          ],
        },
      },
    },
  },
});
```

The configuration is validated when Strapi starts.

## Permissions

The plugin registers four admin permissions in **Settings → Roles → Plugins → Menus**: `Read`, `Create`, `Update` and `Delete`. Super admins have them all; other roles must be granted them to see and edit menus.

The public REST API is governed by the Users & Permissions plugin: enable `find` and `findOne` for `Menu` and `Menu-item` in **Settings → Users & Permissions → Roles**.

## Extending menu items

### 1. Add attributes to the menu item schema

```ts
// src/extensions/menus/strapi-server.ts
export default (plugin) => {
  plugin.contentTypes['menu-item'].schema.attributes = {
    ...plugin.contentTypes['menu-item'].schema.attributes,
    icon: {
      type: 'media',
      allowedTypes: ['images'],
      multiple: false,
    },
    featured: {
      type: 'boolean',
      default: false,
    },
    page: {
      type: 'relation',
      relation: 'manyToOne',
      target: 'api::page.page',
    },
  };

  return plugin;
};
```

> Relations of menu items must be unidirectional (no `inversedBy` / `mappedBy`) unless you also update the target content type.

### 2. Configure the form layout

Each key of `layouts.menuItem` is a tab of the menu item edit panel. The default fields (`title`, `url`, `target`) are rendered in the `link` tab, followed by the fields configured for it; any other key adds a new tab.

```ts
// config/plugins.ts
export default () => ({
  menus: {
    config: {
      layouts: {
        menuItem: {
          link: [
            { input: { name: 'page', type: 'relation', label: 'Page' }, grid: { col: 6 } },
          ],
          appearance: [
            { input: { name: 'icon', type: 'media', label: 'Icon' } },
            { input: { name: 'featured', type: 'bool', label: 'Featured' } },
          ],
        },
      },
    },
  },
});
```

### Field configuration

```ts
{
  input: {
    name: 'field_name', // Attribute name, required.
    type: 'text', // Input type, required. See the table below.
    label: 'Field label',
    description: 'Helper text below the input.',
    placeholder: 'Type something...',
    required: true,
    step: 1, // Numbers only.
    customField: 'plugin::color-picker.color', // Custom fields only.
    options: [{ label: 'Option 1', value: 'option1' }], // Selects only, defaults to the enum values.
  },
  grid: {
    col: 6, // 12 column grid, default 6.
    s: 12, // Tablet, default 12.
    xs: 12, // Mobile, default 12.
  },
}
```

Omit `input` to add white space with `grid` only.

### Supported field types

| Field          | Schema type                                   | Input type                             |
| -------------- | --------------------------------------------- | -------------------------------------- |
| Text           | `string`, `text`                              | `text`, `string`, `textarea`           |
| Email          | `email`                                       | `email`                                |
| Password       | `password`                                    | `password`                             |
| Number         | `integer`, `biginteger`, `float`, `decimal`   | `number`                               |
| Boolean        | `boolean`                                     | `bool`, `boolean`, `checkbox`          |
| Date           | `date`, `time`, `datetime`                    | `date`, `time`, `datetime`             |
| Enumeration    | `enumeration`                                 | `select`, `enumeration`                |
| JSON           | `json`                                        | `json`                                 |
| Media          | `media`                                       | `media`                                |
| Relation       | `relation`                                    | `relation`                             |
| Custom field   | `customField`                                 | `customField` (with `customField` uid) |

Rich text attributes are edited with a plain textarea, unless a plugin registers a `wysiwyg` field in the admin panel. Components, dynamic zones and blocks are not supported.

### Translations

`label`, `description`, `placeholder` and option labels accept a string or a `{ id, defaultMessage }` object. Strings are translated with the keys below, which you can override in `src/admin/app.ts`:

```ts
export default {
  config: {
    locales: ['it'],
    translations: {
      it: {
        'menus.customFields.featured.label': 'In evidenza',
        'menus.customFields.featured.description': 'Mostra la voce in evidenza',
        'menus.customFields.target.options._blank': 'Nuova finestra',
        'menus.edit.tabs.title.appearance': 'Aspetto',
      },
    },
  },
};
```

## API usage

| Method   | Endpoint               | Description           |
| -------- | ---------------------- | --------------------- |
| `GET`    | `/api/menus`           | List menus            |
| `GET`    | `/api/menus/:id`       | Get a menu            |
| `POST`   | `/api/menus`           | Create a menu         |
| `PUT`    | `/api/menus/:id`       | Update a menu         |
| `DELETE` | `/api/menus/:id`       | Delete a menu         |
| `GET`    | `/api/menus/items`     | List menu items       |
| `GET`    | `/api/menus/items/:id` | Get a menu item       |
| `POST`   | `/api/menus/items`     | Create a menu item    |
| `PUT`    | `/api/menus/items/:id` | Update a menu item    |
| `DELETE` | `/api/menus/items/:id` | Delete a menu item    |

`:id` is the `documentId`. All the standard params (`filters`, `populate`, `fields`, `sort`, `pagination`) are supported and, as with any other content type, nothing is populated by default.

> Relations of menu items to content types with Draft & Publish follow the usual Strapi 5 rules: the REST API returns the published version of the related entry, so a relation to an entry that has never been published is returned as `null`.

### Get a menu by slug

```js
import qs from 'qs';

const query = qs.stringify({
  filters: { slug: 'main-menu' },
  populate: { items: { populate: ['page', 'icon'] } },
  nested: true,
});

const res = await fetch(`https://cms.example.com/api/menus?${query}`);
```

### The `nested` param

Without `nested`, `items` is a flat list. With `nested`, only root items are returned in `items`, each with its sub items in `children`, sorted by `order`. The parent of each item is populated automatically and removed from the output, unless you explicitly populate `items.parent`.

```json
{
  "data": [
    {
      "id": 1,
      "documentId": "znrlzntu9ei5onjvwfaalu2v",
      "title": "Main menu",
      "slug": "main-menu",
      "items": [
        {
          "id": 1,
          "documentId": "c7vdrcw0yl3fq0dcrypdv8sp",
          "order": 0,
          "title": "Products",
          "url": "/products",
          "target": null,
          "children": [
            {
              "id": 2,
              "documentId": "lsm0hzjdxg6k1p3xyaddsm0s",
              "order": 0,
              "title": "New arrivals",
              "url": "/products/new",
              "target": null,
              "children": []
            }
          ]
        }
      ]
    }
  ],
  "meta": { "pagination": { "page": 1, "pageSize": 25, "pageCount": 1, "total": 1 } }
}
```

### Strapi 4 response format

Clients that still expect the Strapi 4 format (`data.attributes`) can send the `Strapi-Response-Format: v4` header, handled by Strapi core. `nested` works in both formats; in the v4 format children are returned in `attributes.children.data`.

### Create or update a menu with its items

`items` replaces the items of the menu: missing items are deleted. Existing items are identified by `documentId`, new ones by a `tempId` of your choice, which other items can use as `parent`. The whole menu is saved in a single transaction.

```json
{
  "data": {
    "title": "Main menu",
    "slug": "main-menu",
    "items": [
      { "documentId": "c7vdrcw0yl3fq0dcrypdv8sp", "order": 0, "title": "Products", "url": "/products", "parent": null },
      { "tempId": "new-1", "order": 0, "title": "New arrivals", "url": "/products/new", "parent": "c7vdrcw0yl3fq0dcrypdv8sp" },
      { "tempId": "new-2", "order": 0, "title": "Sale", "url": "/products/new/sale", "parent": "new-1" }
    ]
  }
}
```

`parent` accepts a `documentId`, a `tempId`, `{ "documentId": "..." }` or `null`.

## Documentation plugin

The plugin documents its endpoints in the [Documentation plugin](https://docs.strapi.io/cms/plugins/documentation) when `menus` is part of its plugins list:

```ts
// config/plugins.ts
export default () => ({
  documentation: {
    config: {
      'x-strapi-config': {
        plugins: ['menus', 'upload', 'users-permissions'],
      },
    },
  },
});
```

## Development

```bash
npm install
npm run watch:link   # Rebuild on change and publish to yalc
```

In a Strapi 5 app:

```bash
npx yalc add --link @davideddr/strapi-plugin-menus && npm install
npm run develop -- --watch-admin
```

Checks run in CI:

```bash
npm run lint
npm run test:ts:back && npm run test:ts:front
npm test
npm run build && npm run verify
```

## License

[MIT](./LICENSE). Based on [`strapi-plugin-menus`](https://github.com/mattmilburn/strapi-plugin-menus) by Matt Milburn.
