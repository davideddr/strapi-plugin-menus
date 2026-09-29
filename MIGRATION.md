# Migration

## From `strapi-plugin-menus` 1.x (Strapi 4)

This package keeps the plugin id (`menus`), the content type UIDs (`plugin::menus.menu`, `plugin::menus.menu-item`), the tables (`menus`, `menu_items`) and the configuration of `strapi-plugin-menus`. Menus migrated by the Strapi 4 → 5 upgrade are picked up without any data migration.

### 1. Replace the package

```bash
npm uninstall strapi-plugin-menus
npm install @davideddr/strapi-plugin-menus
```

If you were using a local copy of the plugin (e.g. `resolve: './src/extensions/strapi-plugin-menus'`), remove the `resolve` option and delete the folder. Keep your `config` as is:

```ts
// config/plugins.ts
export default () => ({
  menus: {
    enabled: true,
    config: {
      maxDepth: 2,
    },
  },
});
```

Schema extensions in `src/extensions/menus/strapi-server.(js|ts)` keep working.

### 2. Grant the admin permissions

Admin routes are now protected by RBAC. Grant `Read`, `Create`, `Update` and `Delete` to the roles that manage menus in **Settings → Roles → Plugins → Menus**. Super admins have them by default.

### 3. Update API clients

- **Response format.** Responses follow the Strapi 5 format: fields are returned at the root of each entry, without `attributes` and `data` wrappers. Send the `Strapi-Response-Format: v4` header to get the Strapi 4 format while migrating clients.
- **Ids.** `/api/menus/:id` and `/api/menus/items/:id` expect a `documentId`.
- **Nested items.** With `nested`, sub items are in `children` (`attributes.children.data` in the v4 format), and `items.parent` is populated automatically.
- **Writing items.** When creating or updating a menu, identify existing items with `documentId` and new items with `tempId`; see the README. The legacy format (numeric `id` for existing items, `id: "create..."` for new ones and `parent: { id }`) is still accepted.

### 4. Custom field layouts

`layouts` works as before. Custom fields registered with the Strapi 5 custom fields API are supported, and so are media and relation fields.

### Schema change

The `parent` relation of menu items is now `manyToOne` instead of `oneToOne`, which matches how it has always been used (many children share a parent). Both are stored in the same `menu_items_parent_lnk` link table, with the same columns and indexes, so existing data is not affected. This was verified on SQLite; as for any upgrade, try it on a copy of your production database first.
