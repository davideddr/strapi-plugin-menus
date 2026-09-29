import * as React from 'react';
import { useIntl } from 'react-intl';
import { useDrag, useDrop, type DropTargetMonitor } from 'react-dnd';
import { Box, Flex, IconButton, Typography } from '@strapi/design-system';
import { ArrowDown, ArrowUp, Drag, Plus, Trash, WarningCircle } from '@strapi/icons';
import { styled } from 'styled-components';

import type { MenuItemValue } from '../types';
import { getTranslation } from '../utils/getTranslation';
import { getItemKey, type DropPosition } from '../utils/tree';

export const MENU_ITEM_DND_TYPE = 'menus.menu-item';

interface DragItem {
  key: string;
}

const Card = styled(Box)<{
  $isActive: boolean;
  $hasErrors: boolean;
  $isDragging: boolean;
  $dropPosition: DropPosition | null;
}>`
  cursor: pointer;
  opacity: ${({ $isDragging }) => ($isDragging ? 0.4 : 1)};
  border: 1px solid
    ${({ theme, $isActive, $hasErrors, $dropPosition }) => {
      if ($dropPosition === 'inside') return theme.colors.primary600;
      if ($hasErrors) return theme.colors.danger600;
      if ($isActive) return theme.colors.primary600;
      return theme.colors.neutral200;
    }};
  background: ${({ theme, $isActive, $dropPosition }) =>
    $isActive || $dropPosition === 'inside' ? theme.colors.primary100 : theme.colors.neutral0};
  box-shadow: ${({ theme, $dropPosition }) => {
    if ($dropPosition === 'before') return `0 -3px 0 0 ${theme.colors.primary600}`;
    if ($dropPosition === 'after') return `0 3px 0 0 ${theme.colors.primary600}`;
    return 'none';
  }};

  &:hover {
    border-color: ${({ theme, $hasErrors }) =>
      $hasErrors ? theme.colors.danger600 : theme.colors.primary600};
  }
`;

const DragHandle = styled(IconButton)`
  cursor: grab;
`;

interface TreeMenuItemProps {
  item: MenuItemValue;
  isActive: boolean;
  hasErrors: boolean;
  isFirst: boolean;
  isLast: boolean;
  canAddChild: boolean;
  disabled?: boolean;
  onSelect: () => void;
  onAddChild: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
  /** Whether the dragged item can be dropped at `position` relative to this item. */
  canDropAt: (dragKey: string, position: DropPosition) => boolean;
  onDrop: (dragKey: string, position: DropPosition) => void;
}

const TreeMenuItem = ({
  item,
  isActive,
  hasErrors,
  isFirst,
  isLast,
  canAddChild,
  disabled,
  onSelect,
  onAddChild,
  onMoveUp,
  onMoveDown,
  onRemove,
  canDropAt,
  onDrop,
}: TreeMenuItemProps) => {
  const { formatMessage } = useIntl();
  const key = getItemKey(item);
  const cardRef = React.useRef<HTMLDivElement>(null);
  const [dropPosition, setDropPosition] = React.useState<DropPosition | null>(null);

  /**
   * Top quarter drops before the item, bottom quarter after it, the middle nests the dragged
   * item inside. Falls back to before/after when nesting is not allowed.
   */
  const getDropPosition = (
    dragKey: string,
    monitor: DropTargetMonitor<DragItem>
  ): DropPosition | null => {
    const rect = cardRef.current?.getBoundingClientRect();
    const offset = monitor.getClientOffset();

    if (!rect || !offset || dragKey === key) {
      return null;
    }

    const ratio = (offset.y - rect.top) / rect.height;
    const candidates: DropPosition[] =
      ratio < 0.25
        ? ['before']
        : ratio > 0.75
          ? ['after']
          : ['inside', ratio < 0.5 ? 'before' : 'after'];

    return candidates.find((position) => canDropAt(dragKey, position)) ?? null;
  };

  const [{ isDragging }, dragRef, previewRef] = useDrag(
    () => ({
      type: MENU_ITEM_DND_TYPE,
      item: { key } satisfies DragItem,
      canDrag: !disabled,
      collect: (monitor) => ({ isDragging: monitor.isDragging() }),
    }),
    [key, disabled]
  );

  const [{ isOver }, dropRef] = useDrop<DragItem, void, { isOver: boolean }>(
    () => ({
      accept: MENU_ITEM_DND_TYPE,
      hover: (dragItem, monitor) => setDropPosition(getDropPosition(dragItem.key, monitor)),
      drop: (dragItem, monitor) => {
        const position = getDropPosition(dragItem.key, monitor);

        setDropPosition(null);

        if (position) {
          onDrop(dragItem.key, position);
        }
      },
      collect: (monitor) => ({ isOver: monitor.isOver() }),
    }),
    [key, canDropAt, onDrop]
  );

  previewRef(dropRef(cardRef));

  const stop = (handler: () => void) => (event: React.MouseEvent) => {
    event.stopPropagation();
    handler();
  };

  return (
    <Card
      ref={cardRef}
      $isActive={isActive}
      $hasErrors={hasErrors}
      $isDragging={isDragging}
      $dropPosition={isOver ? dropPosition : null}
      hasRadius
      paddingTop={2}
      paddingBottom={2}
      paddingLeft={2}
      paddingRight={2}
      role="button"
      tabIndex={0}
      aria-pressed={isActive}
      onClick={onSelect}
      onKeyDown={(event: React.KeyboardEvent) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSelect();
        }
      }}
    >
      <Flex justifyContent="space-between" gap={2}>
        <Flex gap={2} minWidth={0}>
          <DragHandle
            ref={dragRef}
            variant="ghost"
            withTooltip={false}
            disabled={disabled}
            label={formatMessage({
              id: getTranslation('ui.drag.menuItem'),
              defaultMessage: 'Drag menu item',
            })}
            onClick={(event: React.MouseEvent) => event.stopPropagation()}
          >
            <Drag />
          </DragHandle>
          <Flex direction="column" alignItems="flex-start" minWidth={0}>
            <Flex gap={1}>
              {hasErrors && <WarningCircle fill="danger600" />}
              <Typography fontWeight="bold" textColor="neutral800" ellipsis>
                {item.title ||
                  formatMessage({ id: getTranslation('ui.untitled'), defaultMessage: 'Untitled' })}
              </Typography>
            </Flex>
            {item.url ? (
              <Typography variant="pi" textColor="neutral600" ellipsis>
                {item.url}
              </Typography>
            ) : null}
          </Flex>
        </Flex>
        <Flex gap={1} shrink={0}>
          {canAddChild && (
            <IconButton
              variant="ghost"
              disabled={disabled}
              label={formatMessage({
                id: getTranslation('ui.add.menu'),
                defaultMessage: 'Add submenu',
              })}
              onClick={stop(onAddChild)}
            >
              <Plus />
            </IconButton>
          )}
          <IconButton
            variant="ghost"
            disabled={disabled || isFirst}
            label={formatMessage({
              id: getTranslation('ui.move.menuItem.up'),
              defaultMessage: 'Move item up',
            })}
            onClick={stop(onMoveUp)}
          >
            <ArrowUp />
          </IconButton>
          <IconButton
            variant="ghost"
            disabled={disabled || isLast}
            label={formatMessage({
              id: getTranslation('ui.move.menuItem.down'),
              defaultMessage: 'Move item down',
            })}
            onClick={stop(onMoveDown)}
          >
            <ArrowDown />
          </IconButton>
          <IconButton
            variant="ghost"
            disabled={disabled}
            label={formatMessage({
              id: getTranslation('ui.delete.menuItem'),
              defaultMessage: 'Delete menu item',
            })}
            onClick={stop(onRemove)}
          >
            <Trash />
          </IconButton>
        </Flex>
      </Flex>
    </Card>
  );
};

export { TreeMenuItem };
