import type { Core, UID } from '@strapi/strapi';
import { errors } from '@strapi/utils';

import { MENU_ITEM_SYSTEM_RELATIONS, UID_MENU_ITEM } from '../constants';

const LISTABLE_TYPES = [
  'string',
  'text',
  'email',
  'uid',
  'integer',
  'biginteger',
  'float',
  'decimal',
  'date',
  'datetime',
  'time',
  'enumeration',
];

export interface SearchParams {
  q?: string;
  page?: number;
  pageSize?: number;
  omit?: string[];
}

const relationsService = ({ strapi }: { strapi: Core.Strapi }) => ({
  /**
   * Field used to display the entries of a model, as configured in the content
   * manager, falling back to `id`.
   */
  async getMainField(uid: string): Promise<string> {
    const model = strapi.getModel(uid as UID.Schema);

    if (!model) {
      return 'id';
    }

    let mainField: string | undefined;

    try {
      const configuration = await strapi
        .plugin('content-manager')
        .service('content-types')
        .findConfiguration(model);

      mainField = configuration?.settings?.mainField;
    } catch {
      mainField = undefined;
    }

    const attribute = mainField ? (model.attributes as Record<string, any>)[mainField] : undefined;

    if (!mainField || !attribute || !LISTABLE_TYPES.includes(attribute.type) || attribute.private) {
      return 'id';
    }

    return mainField;
  },

  getRelationAttribute(field: string) {
    const attribute = (strapi.getModel(UID_MENU_ITEM).attributes as Record<string, any>)[field];

    if (
      !attribute ||
      attribute.type !== 'relation' ||
      !attribute.target ||
      MENU_ITEM_SYSTEM_RELATIONS.includes(field)
    ) {
      throw new errors.NotFoundError(`Relation field ${field} not found on menu items`);
    }

    return attribute as { target: UID.ContentType; relation: string };
  },

  /**
   * Entries that can be connected to the given relation field of a menu item.
   */
  async search(field: string, { q, page = 1, pageSize = 10, omit = [] }: SearchParams) {
    const { target } = this.getRelationAttribute(field);
    const mainField = await this.getMainField(target);

    const filters: Record<string, unknown>[] = [];

    if (omit.length) {
      filters.push({ documentId: { $notIn: omit } });
    }

    if (q) {
      filters.push(
        mainField === 'id' ? { id: Number(q) || 0 } : { [mainField]: { $containsi: q } }
      );
    }

    const fields = Array.from(new Set(['documentId', mainField]));

    const params = {
      filters: filters.length ? { $and: filters } : {},
      fields,
      sort: mainField === 'id' ? 'id:asc' : `${mainField}:asc`,
    } as any;

    const [results, total] = await Promise.all([
      strapi.documents(target).findMany({
        ...params,
        start: (page - 1) * pageSize,
        limit: pageSize,
      }),
      strapi.documents(target).count({ filters: params.filters }),
    ]);

    return {
      results: results.map((entry: Record<string, any>) => ({
        id: entry.id,
        documentId: entry.documentId,
        label: String(entry[mainField] ?? entry.id),
      })),
      pagination: {
        page,
        pageSize,
        pageCount: Math.ceil(total / pageSize),
        total,
      },
    };
  },
});

export default relationsService;
