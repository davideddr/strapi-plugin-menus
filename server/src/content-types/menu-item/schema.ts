export default {
  kind: 'collectionType',
  collectionName: 'menu_items',
  info: {
    singularName: 'menu-item',
    pluralName: 'menu-items',
    displayName: 'Menu Item',
  },
  options: {
    draftAndPublish: false,
  },
  pluginOptions: {
    'content-manager': {
      visible: false,
    },
    'content-type-builder': {
      visible: false,
    },
  },
  attributes: {
    order: {
      type: 'integer',
    },
    title: {
      type: 'string',
      required: true,
    },
    url: {
      type: 'string',
    },
    target: {
      type: 'enumeration',
      enum: ['_blank', '_parent', '_self', '_top'],
    },
    root_menu: {
      type: 'relation',
      relation: 'manyToOne',
      target: 'plugin::menus.menu',
      inversedBy: 'items',
      required: true,
    },
    parent: {
      type: 'relation',
      relation: 'manyToOne',
      target: 'plugin::menus.menu-item',
    },
  },
};
