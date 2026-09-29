import type { Core } from '@strapi/strapi';

import { PLUGIN_ID } from '../constants';
import type { MenusServices } from '../services';

export const getService = <TName extends keyof MenusServices>(
  strapi: Core.Strapi,
  name: TName
): MenusServices[TName] => strapi.plugin(PLUGIN_ID).service(name) as MenusServices[TName];
