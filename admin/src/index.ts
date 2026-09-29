import type { StrapiApp } from '@strapi/strapi/admin';

import { Initializer } from './components/Initializer';
import { PluginIcon } from './components/PluginIcon';
import { PERMISSIONS } from './constants';
import { PLUGIN_ID } from './pluginId';
import { getTranslation } from './utils/getTranslation';

const plugin: StrapiApp['appPlugins'][string] = {
  register(app) {
    app.addMenuLink({
      to: `plugins/${PLUGIN_ID}`,
      icon: PluginIcon,
      intlLabel: {
        id: getTranslation('plugin.name'),
        defaultMessage: 'Menus',
      },
      Component: () => import('./pages/App'),
      permissions: PERMISSIONS.read,
    });

    app.registerPlugin({
      id: PLUGIN_ID,
      initializer: Initializer,
      isReady: false,
      name: PLUGIN_ID,
    });
  },

  async registerTrads({ locales }: { locales: string[] }) {
    return Promise.all(
      locales.map(async (locale) => {
        try {
          const { default: data } = (await import(`./translations/${locale}.json`)) as {
            default: Record<string, string>;
          };

          return {
            data: Object.fromEntries(
              Object.entries(data).map(([key, value]) => [getTranslation(key), value])
            ),
            locale,
          };
        } catch {
          return { data: {}, locale };
        }
      })
    );
  },
};

export default plugin;
