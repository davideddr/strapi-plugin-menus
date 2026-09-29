import type { Core } from '@strapi/strapi';

import { defaultConfig, type MenusPluginConfig } from '../config';
import { MENU_ITEM_SYSTEM_RELATIONS, PLUGIN_ID, UID_MENU, UID_MENU_ITEM } from '../constants';
import { getService } from '../utils/get-service';

const configService = ({ strapi }: { strapi: Core.Strapi }) => ({
  get(): MenusPluginConfig {
    return {
      ...defaultConfig,
      ...strapi.config.get<Partial<MenusPluginConfig>>(`plugin::${PLUGIN_ID}`, {}),
    };
  },

  /**
   * Attributes of the menu and menu item models. Custom relations of menu items
   * carry extra `metadata` the admin panel needs to render a relation input.
   */
  async schema() {
    const menuModel = strapi.getModel(UID_MENU);
    const menuItemModel = strapi.getModel(UID_MENU_ITEM);
    const menuItemAttributes: Record<string, any> = { ...menuItemModel.attributes };

    for (const [name, attribute] of Object.entries(menuItemModel.attributes)) {
      if (
        attribute.type !== 'relation' ||
        MENU_ITEM_SYSTEM_RELATIONS.includes(name) ||
        !('target' in attribute) ||
        !attribute.target
      ) {
        continue;
      }

      const mainField = await getService(strapi, 'relations').getMainField(
        attribute.target as string
      );

      menuItemAttributes[name] = {
        ...attribute,
        metadata: {
          relationType: attribute.relation,
          targetModel: attribute.target,
          mainField,
        },
      };
    }

    return {
      menu: menuModel.attributes,
      menuItem: menuItemAttributes,
    };
  },
});

export default configService;
