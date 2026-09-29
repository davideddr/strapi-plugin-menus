import type { Core, UID } from '@strapi/strapi';

import { UID_MENU, UID_MENU_ITEM, UID_UPLOAD_FILE } from '../constants';

const SPEC_NESTING_LIMIT = 3;

type Spec = Record<string, any>;

const documentationService = ({ strapi }: { strapi: Core.Strapi }) => ({
  getAttributesSpec(uid: string, level = 1): Spec {
    const model = strapi.getModel(uid as UID.Schema);

    if (!model) {
      return {};
    }

    const spec: Spec = {
      id: { type: 'number' },
      documentId: { type: 'string' },
    };

    Object.entries(model.attributes as Record<string, any>).forEach(([key, attribute]) => {
      if (attribute.private) {
        return;
      }

      switch (attribute.type) {
        case 'boolean':
          spec[key] = { type: 'boolean' };
          break;
        case 'integer':
        case 'biginteger':
        case 'decimal':
        case 'float':
          spec[key] = { type: 'number' };
          break;
        case 'date':
          spec[key] = { type: 'string', format: 'date' };
          break;
        case 'datetime':
          spec[key] = { type: 'string', format: 'date-time' };
          break;
        case 'json':
        case 'blocks':
          spec[key] = { type: 'object' };
          break;
        case 'enumeration':
          spec[key] = { type: 'string', enum: attribute.enum };
          break;
        case 'media':
          spec[key] = this.getRelationSpec(UID_UPLOAD_FILE, level, Boolean(attribute.multiple));
          break;
        case 'relation':
          spec[key] = this.getRelationSpec(
            attribute.target,
            level,
            String(attribute.relation).endsWith('Many')
          );
          break;
        default:
          spec[key] = { type: 'string' };
      }
    });

    return spec;
  },

  getRelationSpec(uid: string, level: number, multiple: boolean): Spec {
    const entry = {
      type: 'object',
      properties: level < SPEC_NESTING_LIMIT ? this.getAttributesSpec(uid, level + 1) : {},
    };

    return multiple ? { type: 'array', items: entry } : entry;
  },

  getRequiredAttributes(uid: string): string[] {
    const { attributes } = strapi.getModel(uid as UID.Schema);

    return Object.keys(attributes).filter((name) => (attributes as any)[name].required);
  },

  overrides() {
    const menuRequired = this.getRequiredAttributes(UID_MENU);
    const menuItemSchema = {
      type: 'object',
      properties: {
        ...this.getAttributesSpec(UID_MENU_ITEM),
        children: {
          type: 'array',
          description: 'Sub items, only returned with the `nested` param.',
          items: { $ref: '#/components/schemas/MenuItem' },
        },
      },
      required: this.getRequiredAttributes(UID_MENU_ITEM),
    };

    const menuSchema = {
      type: 'object',
      properties: {
        ...this.getAttributesSpec(UID_MENU),
        items: { type: 'array', items: { $ref: '#/components/schemas/MenuItem' } },
      },
      required: menuRequired,
    };

    const nestedParam = {
      name: 'nested',
      in: 'query',
      description:
        'Serialize menu items into a nested tree using `children`, otherwise they are returned as a flat list.',
      required: false,
      schema: { type: 'boolean' },
    };

    const idParam = {
      name: 'id',
      in: 'path',
      description: 'The `documentId` of the menu.',
      required: true,
      schema: { type: 'string' },
    };

    const menuRequestBody = {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['data'],
            properties: {
              data: {
                type: 'object',
                required: menuRequired,
                properties: this.getAttributesSpec(UID_MENU),
              },
            },
          },
        },
      },
    };

    const menuResponse = (description: string) => ({
      description,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              data: { $ref: '#/components/schemas/Menu' },
              meta: { type: 'object' },
            },
          },
        },
      },
    });

    return {
      components: {
        schemas: {
          Menu: menuSchema,
          MenuItem: menuItemSchema,
        },
      },
      paths: {
        '/menus': {
          get: {
            tags: ['Menu'],
            summary: 'Get a list of menus',
            description:
              'Common parameters such as `populate`, `filters`, `sort` and `pagination` are also available.',
            parameters: [nestedParam],
            responses: {
              200: {
                description: 'A list of menus',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        data: { type: 'array', items: { $ref: '#/components/schemas/Menu' } },
                        meta: { type: 'object' },
                      },
                    },
                  },
                },
              },
            },
          },
          post: {
            tags: ['Menu'],
            summary: 'Create a menu',
            requestBody: menuRequestBody,
            responses: { 200: menuResponse('The created menu') },
          },
        },
        '/menus/{id}': {
          get: {
            tags: ['Menu'],
            summary: 'Get a menu',
            description: 'Common parameters such as `populate` and `fields` are also available.',
            parameters: [idParam, nestedParam],
            responses: { 200: menuResponse('A menu') },
          },
          put: {
            tags: ['Menu'],
            summary: 'Update a menu',
            parameters: [idParam],
            requestBody: menuRequestBody,
            responses: { 200: menuResponse('The updated menu') },
          },
          delete: {
            tags: ['Menu'],
            summary: 'Delete a menu',
            parameters: [idParam],
            responses: { 200: menuResponse('The deleted menu') },
          },
        },
      },
    };
  },
});

export default documentationService;
