import config from './config';
import documentation from './documentation';
import menu from './menu';
import menuItem from './menu-item';
import relations from './relations';
import uid from './uid';

const services = {
  config,
  documentation,
  menu,
  'menu-item': menuItem,
  relations,
  uid,
};

type ServiceFactories = typeof services;

type Resolved = {
  [K in keyof ServiceFactories]: ServiceFactories[K] extends (...args: any[]) => infer R
    ? R
    : never;
};

/**
 * Methods inherited from the core collection type service. They are not inferred
 * because plugin UIDs are not part of the generated content type registry.
 */
interface CoreCollectionTypeService {
  find(params?: Record<string, unknown>): Promise<{ results: any[]; pagination: any }>;
  findOne(documentId: string, params?: Record<string, unknown>): Promise<any>;
}

export type MenusServices = Omit<Resolved, 'menu'> & {
  menu: Resolved['menu'] & CoreCollectionTypeService;
};

export default services;
