import * as React from 'react';
import { useIntl } from 'react-intl';
import { useForm } from '@strapi/strapi/admin';
import { Box, Button, EmptyStateLayout, Flex, Grid, Typography } from '@strapi/design-system';
import { Plus } from '@strapi/icons';
import { EmptyDocuments } from '@strapi/icons/symbols';

import type { MenuItemValue } from '../types';
import type { FieldsLayout } from '../utils/fields-layout';
import { getTranslation } from '../utils/getTranslation';
import {
  addItem,
  canMoveTo,
  getChildren,
  getDepth,
  getDropTarget,
  getItemKey,
  moveItem,
  moveItemTo,
  removeItem,
  type DropPosition,
} from '../utils/tree';
import { MenuItemPanel } from './MenuItemPanel';
import { TreeMenuItem } from './TreeMenuItem';

interface MenuItemsManagerProps {
  layout: FieldsLayout;
  maxDepth: number | null;
  disabled?: boolean;
}

const MenuItemsManager = ({ layout, maxDepth, disabled }: MenuItemsManagerProps) => {
  const { formatMessage } = useIntl();
  const items = useForm(
    'MenuItemsManager',
    (state) => ((state.values as { items?: MenuItemValue[] }).items ?? []) as MenuItemValue[]
  );
  const errors = useForm('MenuItemsManager', (state) => state.errors as { items?: unknown[] });
  const onChange = useForm('MenuItemsManager', (state) => state.onChange);
  const [activeKey, setActiveKey] = React.useState<string | null>(null);

  const activeIndex = activeKey ? items.findIndex((item) => getItemKey(item) === activeKey) : -1;

  const setItems = (nextItems: MenuItemValue[]) => onChange('items', nextItems);

  const handleAdd = (parentKey: string | null) => {
    const { items: nextItems, item } = addItem(items, parentKey);

    setItems(nextItems);
    setActiveKey(getItemKey(item));
  };

  const handleRemove = (key: string) => {
    const nextItems = removeItem(items, key);

    setItems(nextItems);

    // The active item may have been removed along with its ancestor.
    if (activeKey && !nextItems.some((item) => getItemKey(item) === activeKey)) {
      setActiveKey(null);
    }
  };

  const canDropAt = (dragKey: string, targetKey: string, position: DropPosition) => {
    const target = getDropTarget(items, dragKey, targetKey, position);

    return Boolean(target && canMoveTo(items, dragKey, target.parentKey, maxDepth));
  };

  const handleDrop = (dragKey: string, targetKey: string, position: DropPosition) => {
    const target = getDropTarget(items, dragKey, targetKey, position);

    if (!target || !canMoveTo(items, dragKey, target.parentKey, maxDepth)) {
      return;
    }

    setItems(moveItemTo(items, dragKey, target.parentKey, target.index));
    setActiveKey(dragKey);
  };

  const hasErrors = (key: string) => {
    const index = items.findIndex((item) => getItemKey(item) === key);

    return Boolean(Array.isArray(errors?.items) && errors.items[index]);
  };

  const renderLevel = (parentKey: string | null, level: number): React.ReactNode => {
    const children = getChildren(items, parentKey);

    if (!children.length) {
      return null;
    }

    return (
      <Flex direction="column" alignItems="stretch" gap={2} paddingLeft={level > 0 ? 6 : 0}>
        {children.map((item, index) => {
          const key = getItemKey(item);
          const canAddChild = maxDepth === null || getDepth(items, key) + 1 < maxDepth;

          return (
            <Flex key={key} direction="column" alignItems="stretch" gap={2}>
              <TreeMenuItem
                item={item}
                isActive={key === activeKey}
                hasErrors={hasErrors(key)}
                disabled={disabled}
                isFirst={index === 0}
                isLast={index === children.length - 1}
                canAddChild={canAddChild}
                onSelect={() => setActiveKey(key)}
                onAddChild={() => handleAdd(key)}
                onMoveUp={() => setItems(moveItem(items, key, -1))}
                onMoveDown={() => setItems(moveItem(items, key, 1))}
                onRemove={() => handleRemove(key)}
                canDropAt={(dragKey, position) => canDropAt(dragKey, key, position)}
                onDrop={(dragKey, position) => handleDrop(dragKey, key, position)}
              />
              {renderLevel(key, level + 1)}
            </Flex>
          );
        })}
      </Flex>
    );
  };

  const addButton = (
    <Button
      variant="secondary"
      startIcon={<Plus />}
      disabled={disabled}
      onClick={() => handleAdd(null)}
    >
      {formatMessage({ id: getTranslation('ui.add.menuItem'), defaultMessage: 'Add menu item' })}
    </Button>
  );

  return (
    <Box>
      <Box paddingBottom={4}>
        <Typography variant="delta" tag="h2">
          {formatMessage({ id: getTranslation('form.label.items'), defaultMessage: 'Items' })}
        </Typography>
      </Box>
      {items.length === 0 ? (
        <EmptyStateLayout
          icon={<EmptyDocuments width="16rem" />}
          content={formatMessage({
            id: getTranslation('edit.state.empty'),
            defaultMessage: 'Add the first menu item',
          })}
          action={addButton}
        />
      ) : (
        <Grid.Root gap={4}>
          <Grid.Item col={5} s={12} direction="column" alignItems="stretch">
            <Flex direction="column" alignItems="stretch" gap={4}>
              {renderLevel(null, 0)}
              <Box>{addButton}</Box>
            </Flex>
          </Grid.Item>
          <Grid.Item col={7} s={12} direction="column" alignItems="stretch">
            {activeIndex >= 0 ? (
              <Box position="sticky" top={0}>
                <MenuItemPanel
                  key={activeKey}
                  index={activeIndex}
                  layout={layout}
                  disabled={disabled}
                />
              </Box>
            ) : (
              <Box background="neutral0" hasRadius shadow="tableShadow" padding={6}>
                <Typography textColor="neutral600">
                  {formatMessage({
                    id: getTranslation('edit.item.select'),
                    defaultMessage: 'Select a menu item to edit it.',
                  })}
                </Typography>
              </Box>
            )}
          </Grid.Item>
        </Grid.Root>
      )}
    </Box>
  );
};

export { MenuItemsManager };
