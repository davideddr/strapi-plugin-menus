import { useIntl } from 'react-intl';
import { Box, Grid, Tabs, Typography } from '@strapi/design-system';

import type { FieldsLayout } from '../utils/fields-layout';
import { getTranslation } from '../utils/getTranslation';
import { FieldRenderer } from './FieldRenderer';

const toTitle = (value: string) =>
  value
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/^./, (char) => char.toUpperCase());

interface MenuItemPanelProps {
  index: number;
  layout: FieldsLayout;
  disabled?: boolean;
}

const MenuItemPanel = ({ index, layout, disabled }: MenuItemPanelProps) => {
  const { formatMessage } = useIntl();

  const renderFields = (fields: FieldsLayout[number]['fields']) => (
    <Grid.Root gap={4}>
      {fields.map((field) => (
        <Grid.Item
          key={field.key}
          col={field.grid.col}
          s={field.grid.s}
          xs={field.grid.xs}
          direction="column"
          alignItems="stretch"
        >
          {field.input && (
            <FieldRenderer
              name={`items.${index}.${field.input.name}`}
              input={field.input}
              disabled={disabled}
            />
          )}
        </Grid.Item>
      ))}
    </Grid.Root>
  );

  return (
    <Box background="neutral0" hasRadius shadow="tableShadow" padding={6}>
      <Box paddingBottom={4}>
        <Typography variant="delta" tag="h2">
          {formatMessage({
            id: getTranslation('edit.item.title'),
            defaultMessage: 'Edit menu item',
          })}
        </Typography>
      </Box>
      {layout.length === 1 ? (
        renderFields(layout[0].fields)
      ) : (
        <Tabs.Root defaultValue={layout[0]?.name}>
          <Tabs.List
            aria-label={formatMessage({
              id: getTranslation('edit.tabs.title'),
              defaultMessage: 'Edit item',
            })}
          >
            {layout.map((tab) => (
              <Tabs.Trigger key={tab.name} value={tab.name}>
                {formatMessage({
                  id: getTranslation(`edit.tabs.title.${tab.name}`),
                  defaultMessage: toTitle(tab.name),
                })}
              </Tabs.Trigger>
            ))}
          </Tabs.List>
          {layout.map((tab) => (
            <Tabs.Content key={tab.name} value={tab.name}>
              <Box paddingTop={4}>{renderFields(tab.fields)}</Box>
            </Tabs.Content>
          ))}
        </Tabs.Root>
      )}
    </Box>
  );
};

export { MenuItemPanel };
