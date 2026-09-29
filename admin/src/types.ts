import type { MessageDescriptor } from 'react-intl';

export type Translatable = string | MessageDescriptor;

export interface FieldInputConfig {
  name: string;
  type: string;
  label?: Translatable;
  description?: Translatable;
  placeholder?: Translatable;
  required?: boolean;
  step?: number;
  customField?: string;
  options?: Array<string | { label: Translatable; value: string }>;
}

export interface FieldLayout {
  input?: FieldInputConfig;
  grid?: { col?: number; s?: number; xs?: number };
}

export interface PluginConfig {
  maxDepth: number | null;
  layouts: {
    menuItem?: Record<string, FieldLayout[]>;
  };
}

export interface AttributeSchema {
  type: string;
  required?: boolean;
  enum?: string[];
  multiple?: boolean;
  allowedTypes?: string[];
  relation?: string;
  target?: string;
  customField?: string;
  options?: Record<string, unknown>;
  metadata?: {
    relationType: string;
    targetModel: string;
    mainField: string;
  };
  [key: string]: unknown;
}

export interface PluginSchema {
  menu: Record<string, AttributeSchema>;
  menuItem: Record<string, AttributeSchema>;
}

export interface ConfigResponse {
  config: PluginConfig;
  schema: PluginSchema;
}

export interface MenuListItem {
  id: number;
  documentId: string;
  title: string;
  slug: string;
  itemsCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Pagination {
  page: number;
  pageSize: number;
  pageCount: number;
  total: number;
}

export interface MenuItemEntity {
  id: number;
  documentId: string;
  order: number | null;
  title: string;
  url: string | null;
  target: string | null;
  parent: { id: number; documentId: string } | null;
  [key: string]: unknown;
}

export interface MenuEntity {
  id: number;
  documentId: string;
  title: string;
  slug: string;
  items: MenuItemEntity[];
  [key: string]: unknown;
}

/**
 * A menu item in the edit form. Existing items are identified by `documentId`,
 * new ones by `tempId`. `parent` holds the key of the parent item.
 */
export interface MenuItemValue {
  documentId?: string;
  tempId?: string;
  order: number;
  title: string;
  url: string;
  target: string | null;
  parent: string | null;
  [key: string]: unknown;
}

export interface MenuFormValues {
  title: string;
  slug: string;
  items: MenuItemValue[];
}

export interface RelationValue {
  documentId: string;
  id?: number;
  label: string;
}

export interface RelationSearchResponse {
  results: RelationValue[];
  pagination: Pagination;
}
