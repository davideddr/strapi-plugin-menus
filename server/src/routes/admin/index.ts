import { ACTIONS } from '../../constants';

const can = (...actions: string[]) => ({
  policies: [{ name: 'admin::hasPermissions', config: { actions } }],
});

export default () => ({
  type: 'admin',
  routes: [
    {
      method: 'GET',
      path: '/config',
      handler: 'admin.config',
      config: can(ACTIONS.read),
    },
    {
      method: 'POST',
      path: '/uid/generate',
      handler: 'admin.generateUid',
      config: can(ACTIONS.create, ACTIONS.update),
    },
    {
      method: 'POST',
      path: '/uid/check-availability',
      handler: 'admin.checkUidAvailability',
      config: can(ACTIONS.create, ACTIONS.update),
    },
    {
      method: 'GET',
      path: '/relations/:field',
      handler: 'admin.searchRelations',
      config: can(ACTIONS.create, ACTIONS.update),
    },
    {
      method: 'GET',
      path: '/',
      handler: 'admin.find',
      config: can(ACTIONS.read),
    },
    {
      method: 'POST',
      path: '/',
      handler: 'admin.create',
      config: can(ACTIONS.create),
    },
    {
      method: 'GET',
      path: '/:documentId',
      handler: 'admin.findOne',
      config: can(ACTIONS.read),
    },
    {
      method: 'PUT',
      path: '/:documentId',
      handler: 'admin.update',
      config: can(ACTIONS.update),
    },
    {
      method: 'DELETE',
      path: '/:documentId',
      handler: 'admin.delete',
      config: can(ACTIONS.delete),
    },
  ],
});
