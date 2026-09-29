import * as React from 'react';
import { useIntl } from 'react-intl';
import { useNavigate, useParams } from 'react-router-dom';
import {
  BackButton,
  Blocker,
  Form,
  Layouts,
  Page,
  useAPIErrorHandler,
  useNotification,
  useRBAC,
  type FormHelpers,
} from '@strapi/strapi/admin';
import { Box, Button, Flex, Grid } from '@strapi/design-system';
import { Check } from '@strapi/icons';

import { FieldRenderer } from '../components/FieldRenderer';
import { SlugInput } from '../components/fields/SlugInput';
import { MenuItemsManager } from '../components/MenuItemsManager';
import { PERMISSIONS } from '../constants';
import { PLUGIN_ID } from '../pluginId';
import {
  useCreateMenuMutation,
  useGetMenuQuery,
  useGetMenusConfigQuery,
  useUpdateMenuMutation,
} from '../services/api';
import type { MenuFormValues } from '../types';
import { getLayoutFields, getMenuItemLayout } from '../utils/fields-layout';
import { createValidationSchema, toCloneValues, toFormValues, toPayload } from '../utils/form';
import { getTranslation } from '../utils/getTranslation';

const EDIT_PERMISSIONS = [...PERMISSIONS.create, ...PERMISSIONS.update];

const EMPTY_VALUES: MenuFormValues = { title: '', slug: '', items: [] };

const TITLES = {
  create: { id: getTranslation('create.header.title'), defaultMessage: 'Create menu' },
  clone: { id: getTranslation('clone.header.title'), defaultMessage: 'Clone menu' },
  edit: { id: getTranslation('edit.header.title'), defaultMessage: 'Edit menu' },
};

interface EditPageProps {
  mode: 'create' | 'clone' | 'edit';
}

const EditPage = ({ mode }: EditPageProps) => {
  const { formatMessage } = useIntl();
  const navigate = useNavigate();
  const { documentId } = useParams<{ documentId: string }>();
  const { toggleNotification } = useNotification();
  const {
    _unstableFormatAPIError: formatAPIError,
    _unstableFormatValidationErrors: formatValidationErrors,
  } = useAPIErrorHandler();
  const {
    allowedActions: { canCreate, canUpdate },
  } = useRBAC(EDIT_PERMISSIONS);

  const configQuery = useGetMenusConfigQuery();
  const menuQuery = useGetMenuQuery(documentId as string, { skip: mode === 'create' });
  const [createMenu] = useCreateMenuMutation();
  const [updateMenu] = useUpdateMenuMutation();

  const config = configQuery.data?.config;
  const schema = configQuery.data?.schema;

  const layout = React.useMemo(
    () => (config && schema ? getMenuItemLayout(config, schema) : []),
    [config, schema]
  );

  const validationSchema = React.useMemo(
    () => createValidationSchema(getLayoutFields(layout)),
    [layout]
  );

  const initialValues = React.useMemo(() => {
    if (mode === 'create' || !menuQuery.data || !schema) {
      return EMPTY_VALUES;
    }

    const values = toFormValues(menuQuery.data, schema);

    return mode === 'clone' ? toCloneValues(values) : values;
  }, [mode, menuQuery.data, schema]);

  const canSave = mode === 'edit' ? canUpdate : canCreate;

  const handleSubmit = async (
    values: MenuFormValues,
    { setErrors, resetForm }: FormHelpers<MenuFormValues>
  ) => {
    const data = toPayload(values, schema!);
    const res =
      mode === 'edit'
        ? await updateMenu({ documentId: documentId as string, data })
        : await createMenu({ data });

    if ('error' in res) {
      const error = res.error as any;

      if (error?.name === 'ValidationError') {
        setErrors(formatValidationErrors(error) as any);
      }

      toggleNotification({ type: 'danger', message: formatAPIError(error) });
      return;
    }

    toggleNotification({
      type: 'success',
      message: formatMessage({ id: getTranslation('ui.saved'), defaultMessage: 'Saved' }),
    });

    if (mode === 'edit') {
      resetForm(toFormValues(res.data, schema!));
    } else {
      navigate(`/plugins/${PLUGIN_ID}/edit/${res.data.documentId}`, { replace: true });
    }
  };

  if (configQuery.isLoading || menuQuery.isLoading) {
    return <Page.Loading />;
  }

  if (configQuery.error || menuQuery.error || !config || !schema) {
    return <Page.Error />;
  }

  const title = formatMessage(TITLES[mode]);

  return (
    <Page.Main>
      <Page.Title>{title}</Page.Title>
      <Form<MenuFormValues>
        key={`${mode}-${documentId ?? 'new'}`}
        method={mode === 'edit' ? 'PUT' : 'POST'}
        initialValues={initialValues}
        validationSchema={validationSchema}
        onSubmit={handleSubmit}
        disabled={!canSave}
      >
        {({ isSubmitting, modified }) => (
          <>
            <Layouts.Header
              title={mode === 'edit' ? initialValues.title || title : title}
              subtitle={mode === 'edit' ? title : undefined}
              navigationAction={<BackButton fallback={`/plugins/${PLUGIN_ID}`} />}
              primaryAction={
                canSave ? (
                  <Button
                    type="submit"
                    startIcon={<Check />}
                    loading={isSubmitting}
                    disabled={!modified && mode === 'edit'}
                  >
                    {formatMessage({ id: getTranslation('ui.save'), defaultMessage: 'Save' })}
                  </Button>
                ) : undefined
              }
            />
            <Layouts.Content>
              <Flex direction="column" alignItems="stretch" gap={6}>
                <Box background="neutral0" hasRadius shadow="tableShadow" padding={6}>
                  <Grid.Root gap={4}>
                    <Grid.Item col={6} s={12} direction="column" alignItems="stretch">
                      <FieldRenderer
                        name="title"
                        disabled={!canSave}
                        input={{
                          name: 'title',
                          type: 'string',
                          required: true,
                          options: [],
                          label: {
                            id: getTranslation('form.label.title'),
                            defaultMessage: 'Title',
                          },
                        }}
                      />
                    </Grid.Item>
                    <Grid.Item col={6} s={12} direction="column" alignItems="stretch">
                      <SlugInput
                        name="slug"
                        required
                        disabled={!canSave}
                        documentId={mode === 'edit' ? documentId : undefined}
                        label={formatMessage({
                          id: getTranslation('form.label.slug'),
                          defaultMessage: 'Slug',
                        })}
                      />
                    </Grid.Item>
                  </Grid.Root>
                </Box>
                <MenuItemsManager layout={layout} maxDepth={config.maxDepth} disabled={!canSave} />
              </Flex>
            </Layouts.Content>
            <Blocker />
          </>
        )}
      </Form>
    </Page.Main>
  );
};

export { EditPage };
