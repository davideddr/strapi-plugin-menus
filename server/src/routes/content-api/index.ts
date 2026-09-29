/**
 * Menu item routes are declared first, otherwise `/items` would be matched by
 * the `/:id` route of menus.
 */
export default () => ({
  type: 'content-api',
  routes: [
    { method: 'GET', path: '/items', handler: 'menu-item.find' },
    { method: 'GET', path: '/items/:id', handler: 'menu-item.findOne' },
    { method: 'POST', path: '/items', handler: 'menu-item.create' },
    { method: 'PUT', path: '/items/:id', handler: 'menu-item.update' },
    { method: 'DELETE', path: '/items/:id', handler: 'menu-item.delete' },
    { method: 'GET', path: '/', handler: 'menu.find' },
    { method: 'GET', path: '/:id', handler: 'menu.findOne' },
    { method: 'POST', path: '/', handler: 'menu.create' },
    { method: 'PUT', path: '/:id', handler: 'menu.update' },
    { method: 'DELETE', path: '/:id', handler: 'menu.delete' },
  ],
});
