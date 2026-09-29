import type { Core } from '@strapi/strapi';

import { PLUGIN_ID } from './constants';
import documentationService from './services/documentation';

const register = ({ strapi }: { strapi: Core.Strapi }) => {
  const documentation = strapi.plugin('documentation');

  if (!documentation) {
    return;
  }

  // Menus are documented with a hand written spec, since the generated one does
  // not know about the `nested` param and the shape of nested items.
  documentation.service('override').registerOverride(documentationService({ strapi }).overrides(), {
    pluginOrigin: PLUGIN_ID,
    excludeFromGeneration: [PLUGIN_ID],
  });
};

export default register;
