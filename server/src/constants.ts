export const PLUGIN_ID = 'menus';

export const UID_MENU = 'plugin::menus.menu';
export const UID_MENU_ITEM = 'plugin::menus.menu-item';
export const UID_UPLOAD_FILE = 'plugin::upload.file';

export const ACTIONS = {
  read: `plugin::${PLUGIN_ID}.read`,
  create: `plugin::${PLUGIN_ID}.create`,
  update: `plugin::${PLUGIN_ID}.update`,
  delete: `plugin::${PLUGIN_ID}.delete`,
} as const;

/**
 * Menu item attributes managed by the plugin itself. They are never treated as
 * custom fields and never written directly from the request payload.
 */
export const MENU_ITEM_SYSTEM_RELATIONS = ['root_menu', 'parent', 'createdBy', 'updatedBy'];
