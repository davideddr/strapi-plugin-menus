import type { Core } from '@strapi/strapi';
import { errors } from '@strapi/utils';

import { UID_MENU } from '../constants';
import { getService } from '../utils/get-service';

const toPositiveInt = (value: unknown, fallback: number) => {
  const number = Number(value);

  return Number.isInteger(number) && number > 0 ? number : fallback;
};

const toArray = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.map(String);
  }

  return typeof value === 'string' && value ? value.split(',') : [];
};

const getAdminPopulate = (strapi: Core.Strapi) =>
  ({
    items: { populate: getService(strapi, 'menu-item').getAdminPopulation() },
  }) as any;

const SORTABLE_FIELDS = ['title', 'slug', 'createdAt', 'updatedAt'];

/**
 * Controller for the admin panel. Admin routes are protected by RBAC policies, so
 * data is read and written with the Document Service directly.
 */
const adminController = ({ strapi }: { strapi: Core.Strapi }) => ({
  async config(ctx: any) {
    const configService = getService(strapi, 'config');

    ctx.body = {
      config: configService.get(),
      schema: await configService.schema(),
    };
  },

  async find(ctx: any) {
    const page = toPositiveInt(ctx.query.page, 1);
    const pageSize = Math.min(toPositiveInt(ctx.query.pageSize, 10), 100);
    const [sortField, sortOrder] = String(ctx.query.sort ?? 'title:asc').split(':');
    const sort = `${SORTABLE_FIELDS.includes(sortField) ? sortField : 'title'}:${
      sortOrder?.toLowerCase() === 'desc' ? 'desc' : 'asc'
    }`;
    const filters = ctx.query._q
      ? {
          $or: [
            { title: { $containsi: String(ctx.query._q) } },
            { slug: { $containsi: String(ctx.query._q) } },
          ],
        }
      : {};

    const [results, total] = await Promise.all([
      strapi.documents(UID_MENU).findMany({
        filters,
        sort,
        start: (page - 1) * pageSize,
        limit: pageSize,
        populate: { items: { fields: ['documentId'] } },
      }),
      strapi.documents(UID_MENU).count({ filters }),
    ]);

    ctx.body = {
      results: results.map(({ items, ...menu }: any) => ({
        ...menu,
        itemsCount: Array.isArray(items) ? items.length : 0,
      })),
      pagination: {
        page,
        pageSize,
        pageCount: Math.ceil(total / pageSize),
        total,
      },
    };
  },

  async findOne(ctx: any) {
    const menu = await strapi.documents(UID_MENU).findOne({
      documentId: ctx.params.documentId,
      populate: getAdminPopulate(strapi),
    });

    if (!menu) {
      return ctx.notFound();
    }

    ctx.body = { data: menu };
  },

  async create(ctx: any) {
    const { data } = ctx.request.body ?? {};

    if (!data || typeof data !== 'object') {
      throw new errors.ValidationError('Missing "data" payload in the request body');
    }

    const menu = await getService(strapi, 'menu').create({
      data,
      populate: getAdminPopulate(strapi),
    });

    ctx.body = { data: menu };
  },

  async update(ctx: any) {
    const { data } = ctx.request.body ?? {};

    if (!data || typeof data !== 'object') {
      throw new errors.ValidationError('Missing "data" payload in the request body');
    }

    const menu = await getService(strapi, 'menu').update(ctx.params.documentId, {
      data,
      populate: getAdminPopulate(strapi),
    });

    if (!menu) {
      return ctx.notFound();
    }

    ctx.body = { data: menu };
  },

  async delete(ctx: any) {
    const menu = await getService(strapi, 'menu').delete(ctx.params.documentId);

    if (!menu) {
      return ctx.notFound();
    }

    ctx.body = { data: menu };
  },

  async generateUid(ctx: any) {
    const { data = {} } = ctx.request.body ?? {};

    ctx.body = { data: await getService(strapi, 'uid').generate(data) };
  },

  async checkUidAvailability(ctx: any) {
    const { value, documentId } = ctx.request.body ?? {};

    if (typeof value !== 'string' || !value) {
      throw new errors.ValidationError('`value` is required');
    }

    const isAvailable = await getService(strapi, 'uid').checkAvailability(value, documentId);

    ctx.body = {
      isAvailable,
      suggestion: isAvailable ? null : await getService(strapi, 'uid').generate({ title: value }),
    };
  },

  async searchRelations(ctx: any) {
    ctx.body = await getService(strapi, 'relations').search(ctx.params.field, {
      q: ctx.query._q ? String(ctx.query._q) : undefined,
      page: toPositiveInt(ctx.query.page, 1),
      pageSize: Math.min(toPositiveInt(ctx.query.pageSize, 10), 100),
      omit: toArray(ctx.query.omit),
    });
  },
});

export default adminController;
