import { useIntl } from 'react-intl';
import { Link, useNavigate } from 'react-router-dom';
import {
  ConfirmDialog,
  Layouts,
  Page,
  Pagination,
  SearchInput,
  Table,
  useAPIErrorHandler,
  useNotification,
  useQueryParams,
  useRBAC,
} from '@strapi/strapi/admin';
import { Button, Dialog, Flex, IconButton, Typography } from '@strapi/design-system';
import { Duplicate, Pencil, Plus, Trash } from '@strapi/icons';

import { PERMISSIONS } from '../constants';
import { useDeleteMenuMutation, useGetMenusQuery } from '../services/api';
import type { MenuListItem } from '../types';
import { getTranslation } from '../utils/getTranslation';

// `useRBAC` returns `can<Action>` flags, e.g. `canCreate` for `plugin::menus.create`.
const LIST_PERMISSIONS = [...PERMISSIONS.create, ...PERMISSIONS.update, ...PERMISSIONS.delete];

interface ListQuery {
  page?: string;
  pageSize?: string;
  sort?: string;
  _q?: string;
}

const ListPage = () => {
  const { formatMessage, formatDate } = useIntl();
  const navigate = useNavigate();
  const { toggleNotification } = useNotification();
  const { _unstableFormatAPIError: formatAPIError } = useAPIErrorHandler();
  const [{ query }] = useQueryParams<ListQuery>();
  const {
    allowedActions: { canCreate, canUpdate, canDelete },
  } = useRBAC(LIST_PERMISSIONS);

  const { data, isLoading, isFetching, error } = useGetMenusQuery({
    page: query.page ?? 1,
    pageSize: query.pageSize ?? 10,
    sort: query.sort ?? 'title:ASC',
    _q: query._q,
  });
  const [deleteMenu] = useDeleteMenuMutation();

  const menus = data?.results ?? [];
  const pagination = data?.pagination;

  const headers: Table.Header<MenuListItem, any>[] = [
    {
      name: 'title',
      label: formatMessage({ id: getTranslation('form.label.title'), defaultMessage: 'Title' }),
      sortable: true,
    },
    {
      name: 'slug',
      label: formatMessage({ id: getTranslation('form.label.slug'), defaultMessage: 'Slug' }),
      sortable: true,
    },
    {
      name: 'itemsCount',
      label: formatMessage({ id: getTranslation('form.label.items'), defaultMessage: 'Items' }),
      sortable: false,
    },
    {
      name: 'updatedAt',
      label: formatMessage({ id: getTranslation('ui.updatedAt'), defaultMessage: 'Last update' }),
      sortable: true,
    },
  ];

  const handleDelete = async (menu: MenuListItem) => {
    const res = await deleteMenu(menu.documentId);

    if ('error' in res) {
      toggleNotification({ type: 'danger', message: formatAPIError(res.error as any) });
      return;
    }

    toggleNotification({
      type: 'success',
      message: formatMessage({
        id: getTranslation('ui.deleted.menu'),
        defaultMessage: 'Menu has been deleted',
      }),
    });
  };

  if (isLoading) {
    return <Page.Loading />;
  }

  if (error) {
    return <Page.Error />;
  }

  const title = formatMessage({ id: getTranslation('plugin.name'), defaultMessage: 'Menus' });

  return (
    <Page.Main>
      <Page.Title>{title}</Page.Title>
      <Layouts.Header
        title={title}
        subtitle={formatMessage({
          id: getTranslation('index.header.subtitle'),
          defaultMessage: 'Customize the structure of menus and menu items',
        })}
        primaryAction={
          canCreate ? (
            <Button tag={Link} to="create" startIcon={<Plus />}>
              {formatMessage({
                id: getTranslation('ui.create.menu'),
                defaultMessage: 'Create new menu',
              })}
            </Button>
          ) : undefined
        }
      />
      <Layouts.Action
        startActions={
          <SearchInput
            label={formatMessage({
              id: getTranslation('ui.search'),
              defaultMessage: 'Search menus',
            })}
          />
        }
      />
      <Layouts.Content>
        <Flex direction="column" alignItems="stretch" gap={4}>
          <Table.Root rows={menus} headers={headers} isLoading={isFetching}>
            <Table.Content>
              <Table.Head>
                {headers.map((header) => (
                  <Table.HeaderCell key={header.name} {...header} />
                ))}
                <Table.HeaderCell
                  name="actions"
                  label={formatMessage({
                    id: getTranslation('ui.actions'),
                    defaultMessage: 'Actions',
                  })}
                  sortable={false}
                />
              </Table.Head>
              <Table.Empty
                content={formatMessage({
                  id: getTranslation('index.state.empty'),
                  defaultMessage: 'No menus found',
                })}
              />
              <Table.Loading />
              <Table.Body>
                {menus.map((menu) => (
                  <Table.Row
                    key={menu.documentId}
                    cursor={canUpdate ? 'pointer' : undefined}
                    onClick={canUpdate ? () => navigate(`edit/${menu.documentId}`) : undefined}
                  >
                    <Table.Cell>
                      <Typography textColor="neutral800" fontWeight="bold">
                        {menu.title}
                      </Typography>
                    </Table.Cell>
                    <Table.Cell>
                      <Typography textColor="neutral800">{menu.slug}</Typography>
                    </Table.Cell>
                    <Table.Cell>
                      <Typography textColor="neutral800">
                        {formatMessage(
                          {
                            id: getTranslation('ui.items.count'),
                            defaultMessage:
                              '{number, plural, =0 {No items} one {# item} other {# items}}',
                          },
                          { number: menu.itemsCount }
                        )}
                      </Typography>
                    </Table.Cell>
                    <Table.Cell>
                      <Typography textColor="neutral800">
                        {formatDate(menu.updatedAt, { dateStyle: 'medium', timeStyle: 'short' })}
                      </Typography>
                    </Table.Cell>
                    <Table.Cell onClick={(event: React.MouseEvent) => event.stopPropagation()}>
                      <Flex gap={1} justifyContent="flex-end">
                        {canUpdate && (
                          <IconButton
                            tag={Link}
                            to={`edit/${menu.documentId}`}
                            variant="ghost"
                            label={formatMessage({
                              id: getTranslation('ui.edit'),
                              defaultMessage: 'Edit',
                            })}
                          >
                            <Pencil />
                          </IconButton>
                        )}
                        {canCreate && (
                          <IconButton
                            tag={Link}
                            to={`clone/${menu.documentId}`}
                            variant="ghost"
                            label={formatMessage({
                              id: getTranslation('ui.clone'),
                              defaultMessage: 'Clone',
                            })}
                          >
                            <Duplicate />
                          </IconButton>
                        )}
                        {canDelete && (
                          <Dialog.Root>
                            <Dialog.Trigger>
                              <IconButton
                                variant="ghost"
                                label={formatMessage({
                                  id: getTranslation('ui.delete'),
                                  defaultMessage: 'Delete',
                                })}
                              >
                                <Trash />
                              </IconButton>
                            </Dialog.Trigger>
                            <ConfirmDialog onConfirm={() => handleDelete(menu)} />
                          </Dialog.Root>
                        )}
                      </Flex>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Content>
          </Table.Root>
          <Pagination.Root pageCount={pagination?.pageCount} total={pagination?.total}>
            <Pagination.PageSize />
            <Pagination.Links />
          </Pagination.Root>
        </Flex>
      </Layouts.Content>
    </Page.Main>
  );
};

export { ListPage };
