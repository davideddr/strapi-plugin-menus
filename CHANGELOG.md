# Changelog

## 1.1.0

- Drag and drop of menu items in the editor: reorder among siblings or move an item, with its sub-items, under another parent. Drops that would exceed `maxDepth` or nest an item inside itself are refused.
- `react-dnd` `^16.0.0` added to `peerDependencies`; the plugin uses the `DndProvider` already mounted by the Strapi admin.

## 1.0.0

First release for Strapi 5, rewritten from [`strapi-plugin-menus`](https://github.com/mattmilburn/strapi-plugin-menus) 1.6.1 (Strapi 4) by Matt Milburn.

- Built with `@strapi/sdk-plugin` 6, TypeScript strict mode.
- Same plugin id (`menus`), content types and tables as the Strapi 4 plugin.
- Document Service and `documentId` everywhere; menus are saved in a single transaction.
- Default Strapi 5 response format, with `Strapi-Response-Format: v4` support provided by Strapi core.
- `nested` param now works with both response formats and with any `populate` format.
- Admin RBAC permissions: `Read`, `Create`, `Update` and `Delete`.
- Admin panel rebuilt on the public Strapi 5 admin APIs (`Form`, `InputRenderer`, `Layouts`, `Table`, `Pagination`, `adminApi`).
- Custom fields, media (Media Library) and relation fields in custom layouts.
- Documentation plugin override updated to the Strapi 5 response format.
- Italian translation.
