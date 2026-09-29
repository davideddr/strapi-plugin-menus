import type { Core } from '@strapi/strapi';

import { PLUGIN_ID } from './constants';

const bootstrap = async ({ strapi }: { strapi: Core.Strapi }) => {
  await strapi.service('admin::permission').actionProvider.registerMany([
    { section: 'plugins', displayName: 'Read', uid: 'read', pluginName: PLUGIN_ID },
    { section: 'plugins', displayName: 'Create', uid: 'create', pluginName: PLUGIN_ID },
    { section: 'plugins', displayName: 'Update', uid: 'update', pluginName: PLUGIN_ID },
    { section: 'plugins', displayName: 'Delete', uid: 'delete', pluginName: PLUGIN_ID },
  ]);
};

export default bootstrap;
