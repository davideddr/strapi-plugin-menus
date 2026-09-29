import { factories, type Core } from '@strapi/strapi';

import { MENU_ITEM_SYSTEM_RELATIONS, UID_MENU_ITEM } from '../constants';
import { planItemsSync, type ExistingItem, type ItemInput } from '../utils/items';

const menuItemService = factories.createCoreService(
  UID_MENU_ITEM,
  ({ strapi }: { strapi: Core.Strapi }) => ({
    /**
     * Attribute names a client is allowed to write on a menu item.
     */
    getWritableAttributes(): string[] {
      const { attributes } = strapi.getModel(UID_MENU_ITEM);

      return Object.keys(attributes).filter((name) => !MENU_ITEM_SYSTEM_RELATIONS.includes(name));
    },

    /**
     * Population used by the admin panel to edit menu items, including custom
     * relation and media fields.
     */
    getAdminPopulation(): Record<string, unknown> {
      const { attributes } = strapi.getModel(UID_MENU_ITEM);

      return Object.entries(attributes).reduce<Record<string, unknown>>(
        (acc, [name, attribute]) => {
          if (name === 'root_menu' || name === 'createdBy' || name === 'updatedBy') {
            return acc;
          }

          if (name === 'parent') {
            acc[name] = { fields: ['documentId'] };
            return acc;
          }

          if (attribute.type === 'media' || attribute.type === 'relation') {
            acc[name] = true;
          }

          return acc;
        },
        {}
      );
    },

    async findByMenu(menuDocumentId: string): Promise<ExistingItem[]> {
      const items = await strapi.documents(UID_MENU_ITEM).findMany({
        filters: { root_menu: { documentId: menuDocumentId } },
        fields: ['documentId'],
      });

      return items as unknown as ExistingItem[];
    },

    /**
     * Makes the items of a menu match `items` exactly: missing items are deleted,
     * new items are created and existing items are updated. Must run inside a
     * transaction to avoid leaving a menu half saved.
     */
    async syncItems(menuDocumentId: string, items: ItemInput[]) {
      const existing = await this.findByMenu(menuDocumentId);
      const { toDelete, toSave } = planItemsSync(items, existing, this.getWritableAttributes());

      for (const item of toDelete) {
        await strapi.documents(UID_MENU_ITEM).delete({ documentId: item.documentId });
      }

      const documentIdsByRef = new Map<string, string>();

      for (const item of toSave) {
        const parent = item.parentRef ? (documentIdsByRef.get(item.parentRef) ?? null) : null;
        const data = { ...item.data, root_menu: menuDocumentId, parent } as any;

        const saved = item.documentId
          ? await strapi.documents(UID_MENU_ITEM).update({ documentId: item.documentId, data })
          : await strapi.documents(UID_MENU_ITEM).create({ data });

        documentIdsByRef.set(item.ref, saved!.documentId);
      }
    },

    async deleteByMenu(menuDocumentId: string) {
      const items = await this.findByMenu(menuDocumentId);

      for (const item of items) {
        await strapi.documents(UID_MENU_ITEM).delete({ documentId: item.documentId });
      }
    },
  })
);

export default menuItemService;
