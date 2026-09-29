import { adminApi } from '@strapi/strapi/admin';

import { PLUGIN_ID } from '../pluginId';
import type {
  ConfigResponse,
  MenuEntity,
  MenuListItem,
  Pagination,
  RelationSearchResponse,
} from '../types';

const menusApi = adminApi
  .enhanceEndpoints({ addTagTypes: ['MenusConfig', 'MenusMenu'] })
  .injectEndpoints({
    endpoints: (builder) => ({
      menusGetMenusConfig: builder.query<ConfigResponse, void>({
        query: () => `/${PLUGIN_ID}/config`,
        providesTags: ['MenusConfig'],
      }),

      menusGetMenus: builder.query<
        { results: MenuListItem[]; pagination: Pagination },
        { page?: number | string; pageSize?: number | string; sort?: string; _q?: string }
      >({
        query: (params) => ({ url: `/${PLUGIN_ID}`, method: 'GET', config: { params } }),
        providesTags: (result) => [
          { type: 'MenusMenu' as const, id: 'LIST' },
          ...(result?.results ?? []).map(({ documentId }) => ({
            type: 'MenusMenu' as const,
            id: documentId,
          })),
        ],
      }),

      menusGetMenu: builder.query<MenuEntity, string>({
        query: (documentId) => `/${PLUGIN_ID}/${documentId}`,
        transformResponse: (response: { data: MenuEntity }) => response.data,
        providesTags: (_result, _error, documentId) => [
          { type: 'MenusMenu' as const, id: documentId },
        ],
      }),

      menusCreateMenu: builder.mutation<MenuEntity, { data: Record<string, unknown> }>({
        query: (body) => ({ url: `/${PLUGIN_ID}`, method: 'POST', data: body }),
        transformResponse: (response: { data: MenuEntity }) => response.data,
        invalidatesTags: [{ type: 'MenusMenu', id: 'LIST' }],
      }),

      menusUpdateMenu: builder.mutation<
        MenuEntity,
        { documentId: string; data: Record<string, unknown> }
      >({
        query: ({ documentId, data }) => ({
          url: `/${PLUGIN_ID}/${documentId}`,
          method: 'PUT',
          data: { data },
        }),
        transformResponse: (response: { data: MenuEntity }) => response.data,
        invalidatesTags: (_result, _error, { documentId }) => [
          { type: 'MenusMenu', id: 'LIST' },
          { type: 'MenusMenu', id: documentId },
        ],
      }),

      menusDeleteMenu: builder.mutation<MenuEntity, string>({
        query: (documentId) => ({ url: `/${PLUGIN_ID}/${documentId}`, method: 'DELETE' }),
        invalidatesTags: (_result, _error, documentId) => [
          { type: 'MenusMenu', id: 'LIST' },
          { type: 'MenusMenu', id: documentId },
        ],
      }),

      menusGenerateSlug: builder.mutation<string, { data: Record<string, unknown> }>({
        query: (body) => ({ url: `/${PLUGIN_ID}/uid/generate`, method: 'POST', data: body }),
        transformResponse: (response: { data: string }) => response.data,
      }),

      menusCheckSlugAvailability: builder.query<
        { isAvailable: boolean; suggestion: string | null },
        { value: string; documentId?: string }
      >({
        query: (body) => ({
          url: `/${PLUGIN_ID}/uid/check-availability`,
          method: 'POST',
          data: body,
        }),
        keepUnusedDataFor: 0,
      }),

      menusSearchRelations: builder.query<
        RelationSearchResponse,
        { field: string; _q?: string; page?: number; pageSize?: number; omit?: string[] }
      >({
        query: ({ field, ...params }) => ({
          url: `/${PLUGIN_ID}/relations/${field}`,
          method: 'GET',
          config: { params },
        }),
      }),
    }),
    overrideExisting: false,
  });

export const {
  useMenusGetMenusConfigQuery: useGetMenusConfigQuery,
  useMenusGetMenusQuery: useGetMenusQuery,
  useMenusGetMenuQuery: useGetMenuQuery,
  useMenusCreateMenuMutation: useCreateMenuMutation,
  useMenusUpdateMenuMutation: useUpdateMenuMutation,
  useMenusDeleteMenuMutation: useDeleteMenuMutation,
  useMenusGenerateSlugMutation: useGenerateSlugMutation,
  useLazyMenusCheckSlugAvailabilityQuery: useLazyCheckSlugAvailabilityQuery,
  useLazyMenusSearchRelationsQuery: useLazySearchRelationsQuery,
} = menusApi;
