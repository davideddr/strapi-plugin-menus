export interface MenuItemFieldInput {
  name: string;
  type: string;
  label?: string | { id: string; defaultMessage: string };
  description?: string | { id: string; defaultMessage: string };
  placeholder?: string | { id: string; defaultMessage: string };
  required?: boolean;
  step?: number;
  customField?: string;
  options?: Array<{ label: string | { id: string; defaultMessage: string }; value: string }>;
}

export interface MenuItemFieldLayout {
  input?: MenuItemFieldInput;
  grid?: { col?: number; s?: number; xs?: number };
}

export interface MenusPluginConfig {
  maxDepth: number | null;
  layouts: {
    menuItem?: Record<string, MenuItemFieldLayout[]>;
  };
}

export const defaultConfig: MenusPluginConfig = {
  maxDepth: null,
  layouts: {},
};

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const validateConfig = (config: Partial<MenusPluginConfig>) => {
  const { maxDepth, layouts } = config;

  if (maxDepth !== undefined && maxDepth !== null) {
    if (!Number.isInteger(maxDepth) || maxDepth < 1) {
      throw new Error('[menus] `maxDepth` must be a positive integer or `null`.');
    }
  }

  if (layouts === undefined) {
    return;
  }

  if (!isPlainObject(layouts)) {
    throw new Error('[menus] `layouts` must be an object.');
  }

  if (layouts.menuItem === undefined) {
    return;
  }

  if (!isPlainObject(layouts.menuItem)) {
    throw new Error('[menus] `layouts.menuItem` must be an object of tabs.');
  }

  Object.entries(layouts.menuItem).forEach(([tab, fields]) => {
    if (!Array.isArray(fields)) {
      throw new Error(`[menus] \`layouts.menuItem.${tab}\` must be an array of fields.`);
    }

    fields.forEach((field, index) => {
      const path = `layouts.menuItem.${tab}[${index}]`;

      if (!isPlainObject(field) || (!field.input && !field.grid)) {
        throw new Error(`[menus] \`${path}\` must define an \`input\` and/or a \`grid\` prop.`);
      }

      if (field.input) {
        const { name, type, customField } = field.input as MenuItemFieldInput;

        if (typeof name !== 'string' || !name) {
          throw new Error(`[menus] \`${path}.input.name\` is required.`);
        }

        if (typeof type !== 'string' || !type) {
          throw new Error(`[menus] \`${path}.input.type\` is required.`);
        }

        if (type === 'customField' && typeof customField !== 'string') {
          throw new Error(`[menus] \`${path}.input.customField\` is required for custom fields.`);
        }
      }
    });
  });
};

export default {
  default: defaultConfig,
  validator: validateConfig,
};
