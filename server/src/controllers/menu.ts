import omit from 'lodash/omit';
import { factories, type Core } from '@strapi/strapi';
import { errors } from '@strapi/utils';

import { UID_MENU, UID_MENU_ITEM } from '../constants';
import { getService } from '../utils/get-service';
import type { ItemInput } from '../utils/items';
import { serializeNested } from '../utils/nested';
import { getNestedParams, hasParentPopulation } from '../utils/populate';

const ITEM_IDENTITY_KEYS = ['id', 'documentId', 'tempId', 'parent'];

/**
 * Reads and removes the custom `nested` param, so it is not rejected by the
 * query validation when `api.rest.strictParams` is enabled.
 */
const extractNested = (ctx: any): boolean => {
  const query = ctx.query ?? {};
  const isNested =
    Object.prototype.hasOwnProperty.call(query, 'nested') && query.nested !== 'false';

  ctx.query = omit(query, 'nested');

  return isNested;
};

/**
 * Validates and sanitizes the menu payload. Menu items are handled one by one
 * against the menu item model, keeping the keys that identify them in the tree.
 */
const sanitizeMenuInput = async (
  strapi: Core.Strapi,
  controller: {
    validateInput?: (data: any, ctx: any) => Promise<unknown>;
    sanitizeInput?: (data: any, ctx: any) => Promise<unknown>;
  },
  ctx: any
): Promise<Record<string, unknown>> => {
  const { data } = ctx.request.body ?? {};

  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    throw new errors.ValidationError('Missing "data" payload in the request body');
  }

  const { items, ...menuData } = data;

  await controller.validateInput!(menuData, ctx);
  const sanitizedMenu = (await controller.sanitizeInput!(menuData, ctx)) as Record<string, unknown>;

  if (items === undefined) {
    return sanitizedMenu;
  }

  if (!Array.isArray(items)) {
    throw new errors.ValidationError('`items` must be an array');
  }

  const menuItemModel = strapi.getModel(UID_MENU_ITEM);
  const options = { auth: ctx.state?.auth, route: ctx.state?.route };

  const sanitizedItems: ItemInput[] = await Promise.all(
    items.map(async (item: Record<string, unknown>) => {
      const itemData = omit(item, ITEM_IDENTITY_KEYS);

      await strapi.contentAPI.validate.input(itemData, menuItemModel, options);
      const sanitizedItem = (await strapi.contentAPI.sanitize.input(
        itemData,
        menuItemModel,
        options
      )) as Record<string, unknown>;

      const identity = ITEM_IDENTITY_KEYS.reduce<Record<string, unknown>>((acc, key) => {
        if (key in item) {
          acc[key] = item[key];
        }

        return acc;
      }, {});

      return { ...sanitizedItem, ...identity } as ItemInput;
    })
  );

  return { ...sanitizedMenu, items: sanitizedItems };
};

const menuController = factories.createCoreController(UID_MENU, ({ strapi }) => ({
  async find(ctx) {
    const isNested = extractNested(ctx);

    await this.validateQuery(ctx);
    const sanitizedQuery = await this.sanitizeQuery(ctx);
    const params = isNested ? getNestedParams(sanitizedQuery) : sanitizedQuery;

    const { results, pagination } = await getService(strapi, 'menu').find(params);
    const sanitizedResults = await this.sanitizeOutput(results, ctx);
    const response = await this.transformResponse(sanitizedResults, { pagination });

    return isNested ? serializeNested(response, hasParentPopulation(sanitizedQuery)) : response;
  },

  async findOne(ctx) {
    const { id: documentId } = ctx.params;
    const isNested = extractNested(ctx);

    await this.validateQuery(ctx);
    const sanitizedQuery = await this.sanitizeQuery(ctx);
    const params = isNested ? getNestedParams(sanitizedQuery) : sanitizedQuery;

    const entity = await getService(strapi, 'menu').findOne(documentId, params);

    if (!entity) {
      return ctx.notFound();
    }

    const sanitizedEntity = await this.sanitizeOutput(entity, ctx);
    const response = await this.transformResponse(sanitizedEntity);

    return isNested ? serializeNested(response, hasParentPopulation(sanitizedQuery)) : response;
  },

  async create(ctx) {
    const isNested = extractNested(ctx);
    const data = await sanitizeMenuInput(strapi, this, ctx);

    await this.validateQuery(ctx);
    const sanitizedQuery = await this.sanitizeQuery(ctx);
    const params = isNested ? getNestedParams(sanitizedQuery) : sanitizedQuery;

    const entity = await getService(strapi, 'menu').create({ ...params, data });
    const sanitizedEntity = await this.sanitizeOutput(entity, ctx);
    const response = await this.transformResponse(sanitizedEntity);

    return isNested ? serializeNested(response, hasParentPopulation(sanitizedQuery)) : response;
  },

  async update(ctx) {
    const { id: documentId } = ctx.params;
    const isNested = extractNested(ctx);
    const data = await sanitizeMenuInput(strapi, this, ctx);

    await this.validateQuery(ctx);
    const sanitizedQuery = await this.sanitizeQuery(ctx);
    const params = isNested ? getNestedParams(sanitizedQuery) : sanitizedQuery;

    const entity = await getService(strapi, 'menu').update(documentId, { ...params, data });

    if (!entity) {
      return ctx.notFound();
    }

    const sanitizedEntity = await this.sanitizeOutput(entity, ctx);
    const response = await this.transformResponse(sanitizedEntity);

    return isNested ? serializeNested(response, hasParentPopulation(sanitizedQuery)) : response;
  },

  async delete(ctx) {
    const { id: documentId } = ctx.params;

    await this.validateQuery(ctx);
    const sanitizedQuery = await this.sanitizeQuery(ctx);

    const entity = await getService(strapi, 'menu').delete(documentId, sanitizedQuery);

    if (!entity) {
      return ctx.notFound();
    }

    const sanitizedEntity = await this.sanitizeOutput(entity, ctx);

    return this.transformResponse(sanitizedEntity);
  },
}));

export default menuController;
