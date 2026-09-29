import * as yup from 'yup';
import { translatedErrors } from '@strapi/strapi/admin';

import {
  URL_ABSOLUTE_REGEX,
  URL_MAILTO_REGEX,
  URL_RELATIVE_REGEX,
  URL_TEL_REGEX,
} from '../constants';
import type {
  MenuEntity,
  MenuFormValues,
  MenuItemValue,
  PluginSchema,
  RelationValue,
} from '../types';
import type { NormalizedInput } from './fields-layout';
import { getTranslation } from './getTranslation';
import { createTempId, getItemKey } from './tree';

const required = {
  id: translatedErrors.required.id,
  defaultMessage: 'This field is required.',
};

const isValidUrl = (value?: string | null) =>
  !value ||
  URL_ABSOLUTE_REGEX.test(value) ||
  URL_RELATIVE_REGEX.test(value) ||
  URL_MAILTO_REGEX.test(value) ||
  URL_TEL_REGEX.test(value);

const isEmpty = (value: unknown) =>
  value === undefined ||
  value === null ||
  value === '' ||
  (Array.isArray(value) && value.length === 0);

export const createValidationSchema = (fields: NormalizedInput[]) => {
  const customRequired = fields.filter(
    (field) => field.required && !['title', 'url', 'target'].includes(field.name)
  );

  const itemShape: Record<string, yup.AnySchema> = {
    title: yup.string().nullable().required(required),
    url: yup
      .string()
      .nullable()
      .test(
        'is-url',
        {
          id: getTranslation('error.url.invalid'),
          defaultMessage: 'This is an invalid URL format',
        } as any,
        isValidUrl
      ),
    target: yup.string().nullable(),
  };

  customRequired.forEach((field) => {
    itemShape[field.name] = yup
      .mixed()
      .test('required', required as any, (value) => !isEmpty(value));
  });

  return yup.object().shape({
    title: yup.string().nullable().required(required),
    slug: yup
      .string()
      .nullable()
      .required(required)
      .matches(/^[A-Za-z0-9-_.~]*$/, {
        message: {
          id: translatedErrors.regex.id,
          defaultMessage: 'The value does not match the regex.',
        } as any,
      }),
    items: yup.array().of(yup.object().shape(itemShape)),
  });
};

const toRelationValues = (value: unknown, mainField: string): RelationValue[] => {
  const list = Array.isArray(value) ? value : value ? [value] : [];

  return list.map((entry: Record<string, any>) => ({
    id: entry.id,
    documentId: entry.documentId,
    label: String(entry[mainField] ?? entry.documentId ?? entry.id),
  }));
};

/**
 * Converts a menu returned by the admin API into form values.
 */
export const toFormValues = (menu: MenuEntity, schema: PluginSchema): MenuFormValues => ({
  title: menu.title ?? '',
  slug: menu.slug ?? '',
  items: (menu.items ?? []).map((item) => {
    const { id: _id, parent, createdAt: _c, updatedAt: _u, ...rest } = item as Record<string, any>;
    const value: MenuItemValue = {
      ...rest,
      documentId: item.documentId,
      order: item.order ?? 0,
      title: item.title ?? '',
      url: item.url ?? '',
      target: item.target ?? null,
      parent: parent?.documentId ?? null,
    };

    Object.entries(schema.menuItem).forEach(([name, attribute]) => {
      if (attribute.type === 'relation' && attribute.metadata) {
        value[name] = toRelationValues(item[name], attribute.metadata.mainField);
      }
    });

    return value;
  }),
});

/**
 * Form values of a clone: every item becomes a new item, keeping the tree.
 */
export const toCloneValues = (values: MenuFormValues): MenuFormValues => {
  const tempIds = new Map(values.items.map((item) => [getItemKey(item), createTempId()]));

  return {
    title: values.title,
    slug: '',
    items: values.items.map((item) => {
      const { documentId: _documentId, ...rest } = item;

      return {
        ...rest,
        tempId: tempIds.get(getItemKey(item)),
        parent: item.parent ? (tempIds.get(item.parent) ?? null) : null,
      };
    }),
  };
};

const toMediaPayload = (value: unknown) => {
  if (Array.isArray(value)) {
    return value.map((asset) => asset?.id).filter(Boolean);
  }

  return (value as { id?: number } | null)?.id ?? null;
};

const toNumberPayload = (value: unknown) => {
  if (value === '' || value === null || value === undefined) {
    return null;
  }

  const number = Number(value);

  return Number.isNaN(number) ? null : number;
};

/**
 * Converts form values into the payload expected by the admin API.
 */
export const toPayload = (values: MenuFormValues, schema: PluginSchema) => ({
  title: values.title?.trim(),
  slug: values.slug?.trim(),
  items: values.items.map((item) => {
    const payload: Record<string, unknown> = {
      ...(item.documentId ? { documentId: item.documentId } : { tempId: item.tempId }),
      order: item.order,
      title: item.title?.trim(),
      url: item.url?.trim() || null,
      target: item.target || null,
      parent: item.parent,
    };

    Object.entries(schema.menuItem).forEach(([name, attribute]) => {
      if (name in payload || !(name in item) || name === 'root_menu') {
        return;
      }

      const value = item[name];

      switch (attribute.type) {
        case 'relation':
          payload[name] = {
            set: (Array.isArray(value) ? value : []).map((relation: RelationValue) => ({
              documentId: relation.documentId,
            })),
          };
          break;
        case 'media':
          payload[name] = toMediaPayload(value);
          break;
        case 'integer':
        case 'biginteger':
        case 'float':
        case 'decimal':
          payload[name] = toNumberPayload(value);
          break;
        case 'boolean':
          payload[name] = value === null || value === undefined ? value : Boolean(value);
          break;
        case 'string':
        case 'text':
          payload[name] = typeof value === 'string' ? value.trim() : value;
          break;
        default:
          payload[name] = value;
      }
    });

    return payload;
  }),
});
