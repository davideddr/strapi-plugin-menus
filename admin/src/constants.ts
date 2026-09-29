import { PLUGIN_ID } from './pluginId';

export const UID_MENU = 'plugin::menus.menu';
export const UID_MENU_ITEM = 'plugin::menus.menu-item';

export const PERMISSIONS = {
  read: [{ action: `plugin::${PLUGIN_ID}.read`, subject: null }],
  create: [{ action: `plugin::${PLUGIN_ID}.create`, subject: null }],
  update: [{ action: `plugin::${PLUGIN_ID}.update`, subject: null }],
  delete: [{ action: `plugin::${PLUGIN_ID}.delete`, subject: null }],
};

export const TARGET_OPTIONS = ['_blank', '_parent', '_self', '_top'];

export const URL_ABSOLUTE_REGEX = new RegExp(
  '^(https?:\\/\\/)?' +
    '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|' +
    '((\\d{1,3}\\.){3}\\d{1,3}))' +
    '(\\:\\d+)?(\\/[-a-z\\d%_:.~+@]*)*' +
    '(\\?[-a-z\\d%_:.~+@;&=]*)?' +
    '(\\#[-a-z\\d_]*)?$',
  'i'
);

export const URL_RELATIVE_REGEX = new RegExp(
  '^(\\/[-a-z\\d%_:.~+@]*)*' + '(\\?[-a-z\\d%_:.~+@;&=]*)?' + '(\\#[-a-z\\d_]*)?$',
  'i'
);

export const URL_MAILTO_REGEX = /^mailto:(.*)@(.*)\.(.*)$/i;

export const URL_TEL_REGEX = /^tel:(\+|\d)[\d-]+$/i;
