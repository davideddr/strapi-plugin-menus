import type { MessageDescriptor } from 'react-intl';

import { TARGET_OPTIONS } from '../constants';
import type {
  AttributeSchema,
  FieldLayout,
  PluginConfig,
  PluginSchema,
  Translatable,
} from '../types';
import { getTranslation } from './getTranslation';

export interface Grid {
  col: number;
  s: number;
  xs: number;
}

export interface NormalizedInput {
  name: string;
  type: string;
  label: MessageDescriptor;
  hint?: MessageDescriptor;
  placeholder?: MessageDescriptor;
  required: boolean;
  step?: number;
  customField?: string;
  options: Array<{ label: MessageDescriptor; value: string }>;
  attribute?: AttributeSchema;
}

export interface NormalizedField {
  key: string;
  grid: Grid;
  input?: NormalizedInput;
}

export type FieldsLayout = Array<{ name: string; fields: NormalizedField[] }>;

const DEFAULT_GRID: Grid = { col: 6, s: 12, xs: 12 };

const DEFAULT_MENU_ITEM_FIELDS: FieldLayout[] = [
  {
    input: {
      name: 'title',
      type: 'text',
      required: true,
      label: { id: getTranslation('form.label.title'), defaultMessage: 'Title' },
      placeholder: { id: getTranslation('form.placeholder.untitled'), defaultMessage: 'Untitled' },
    },
  },
  {
    input: {
      name: 'url',
      type: 'text',
      label: { id: getTranslation('form.label.url'), defaultMessage: 'URL' },
    },
  },
  {
    input: {
      name: 'target',
      type: 'select',
      label: { id: getTranslation('form.label.target'), defaultMessage: 'Target' },
      options: TARGET_OPTIONS.map((option) => ({
        value: option,
        label: { id: getTranslation(`form.label.option.${option}`), defaultMessage: option },
      })),
    },
  },
];

const translatable = (
  value: Translatable | undefined,
  id: string,
  fallback?: string
): MessageDescriptor | undefined => {
  if (value === undefined || value === null) {
    return fallback === undefined ? undefined : { id, defaultMessage: fallback };
  }

  if (typeof value === 'string') {
    return { id, defaultMessage: value };
  }

  return value;
};

export const normalizeField = (
  field: FieldLayout,
  index: number,
  schema: PluginSchema['menuItem']
): NormalizedField => {
  const grid = { ...DEFAULT_GRID, ...field.grid };

  if (!field.input) {
    return { key: `spacer-${index}`, grid };
  }

  const { name, type, label, description, placeholder, required, step, customField } = field.input;
  const attribute = schema[name];
  const prefix = `customFields.${name}`;
  const rawOptions = field.input.options ?? (Array.isArray(attribute?.enum) ? attribute.enum : []);

  return {
    key: name,
    grid,
    input: {
      name,
      type,
      label: translatable(label, getTranslation(`${prefix}.label`), name)!,
      hint: translatable(description, getTranslation(`${prefix}.description`)),
      placeholder: translatable(placeholder, getTranslation(`${prefix}.placeholder`)),
      required: Boolean(required ?? attribute?.required),
      step,
      customField: customField ?? attribute?.customField,
      attribute,
      options: rawOptions.map((option) => {
        const value = typeof option === 'string' ? option : option.value;
        const optionLabel = typeof option === 'string' ? option : option.label;

        return {
          value,
          label: translatable(optionLabel, getTranslation(`${prefix}.options.${value}`), value)!,
        };
      }),
    },
  };
};

/**
 * Tabs of the menu item edit panel. The default fields are rendered in the `link`
 * tab, followed by any custom field configured for it; every other key of
 * `layouts.menuItem` becomes a new tab.
 */
export const getMenuItemLayout = (config: PluginConfig, schema: PluginSchema): FieldsLayout => {
  const customLayouts = config.layouts?.menuItem ?? {};
  const tabs: Record<string, FieldLayout[]> = {
    link: [...DEFAULT_MENU_ITEM_FIELDS, ...(customLayouts.link ?? [])],
  };

  Object.entries(customLayouts).forEach(([name, fields]) => {
    if (name !== 'link') {
      tabs[name] = fields;
    }
  });

  return Object.entries(tabs).map(([name, fields]) => ({
    name,
    fields: fields.map((field, index) => normalizeField(field, index, schema.menuItem)),
  }));
};

export const getLayoutFields = (layout: FieldsLayout) =>
  layout.flatMap((tab) => tab.fields).flatMap((field) => (field.input ? [field.input] : []));
