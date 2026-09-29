import omit from 'lodash/omit';
import { factories, type Core } from '@strapi/strapi';
import { errors } from '@strapi/utils';

import { UID_MENU } from '../constants';
import { getService } from '../utils/get-service';
import type { ItemInput } from '../utils/items';

type Params = Record<string, any> & { data?: Record<string, any> };

const MENU_OMIT_KEYS = [
  'id',
  'documentId',
  'items',
  'createdAt',
  'updatedAt',
  'createdBy',
  'updatedBy',
];

const menuService = factories.createCoreService(
  UID_MENU,
  ({ strapi }: { strapi: Core.Strapi }) => ({
    async create(params: Params = {}) {
      const { data = {}, ...query } = params;
      const items = data.items as ItemInput[] | undefined;

      await this.assertSlugAvailable(data.slug);

      const documentId = await strapi.db.transaction(async () => {
        const menu = await strapi.documents(UID_MENU).create({
          data: omit(data, MENU_OMIT_KEYS) as any,
        });

        if (items) {
          await getService(strapi, 'menu-item').syncItems(menu.documentId, items);
        }

        return menu.documentId;
      });

      return strapi.documents(UID_MENU).findOne({ ...query, documentId });
    },

    async update(documentId: string, params: Params = {}) {
      const { data = {}, ...query } = params;
      const items = data.items as ItemInput[] | undefined;

      const menu = await strapi.documents(UID_MENU).findOne({ documentId, fields: ['documentId'] });

      if (!menu) {
        return null;
      }

      if (data.slug !== undefined) {
        await this.assertSlugAvailable(data.slug, documentId);
      }

      await strapi.db.transaction(async () => {
        await strapi.documents(UID_MENU).update({
          documentId,
          data: omit(data, MENU_OMIT_KEYS) as any,
        });

        if (items) {
          await getService(strapi, 'menu-item').syncItems(documentId, items);
        }
      });

      return strapi.documents(UID_MENU).findOne({ ...query, documentId });
    },

    async delete(documentId: string, params: Params = {}) {
      const menu = await strapi.documents(UID_MENU).findOne({ ...params, documentId });

      if (!menu) {
        return null;
      }

      await strapi.db.transaction(async () => {
        await getService(strapi, 'menu-item').deleteByMenu(documentId);
        await strapi.documents(UID_MENU).delete({ documentId });
      });

      return menu;
    },

    async assertSlugAvailable(slug: unknown, excludeDocumentId?: string) {
      if (typeof slug !== 'string' || !slug) {
        return;
      }

      const isAvailable = await getService(strapi, 'uid').checkAvailability(
        slug,
        excludeDocumentId
      );

      if (!isAvailable) {
        throw new errors.ValidationError(`The slug ${slug} is already taken`, {
          errors: [
            {
              path: ['slug'],
              message: `The slug ${slug} is already taken`,
              name: 'ValidationError',
            },
          ],
        });
      }
    },
  })
);

export default menuService;
