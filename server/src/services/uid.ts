import type { Core } from '@strapi/strapi';

import { UID_MENU } from '../constants';

const uidService = ({ strapi }: { strapi: Core.Strapi }) => ({
  async checkAvailability(slug: string, excludeDocumentId?: string) {
    const filters: Record<string, unknown> = { slug };

    // Do not check a menu against itself.
    if (excludeDocumentId) {
      filters.documentId = { $ne: excludeDocumentId };
    }

    const count = await strapi.documents(UID_MENU).count({ filters });

    return count === 0;
  },

  async generate(data: Record<string, unknown>) {
    return strapi.plugin('content-manager').service('uid').generateUIDField({
      contentTypeUID: UID_MENU,
      field: 'slug',
      data,
    }) as Promise<string>;
  },
});

export default uidService;
