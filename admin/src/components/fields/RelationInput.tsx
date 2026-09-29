import * as React from 'react';
import { useIntl } from 'react-intl';
import { useField } from '@strapi/strapi/admin';
import {
  Box,
  Combobox,
  ComboboxOption,
  Field,
  Flex,
  IconButton,
  Typography,
} from '@strapi/design-system';
import { Cross } from '@strapi/icons';

import { useLazySearchRelationsQuery } from '../../services/api';
import type { AttributeSchema, RelationValue } from '../../types';
import { getTranslation } from '../../utils/getTranslation';

const TO_ONE_RELATIONS = ['oneToOne', 'manyToOne', 'oneWay'];
const PAGE_SIZE = 10;

interface RelationInputProps {
  name: string;
  label: string;
  hint?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  attribute?: AttributeSchema;
}

const RelationInput = ({
  name,
  label,
  hint,
  placeholder,
  required,
  disabled,
  attribute,
}: RelationInputProps) => {
  const { formatMessage } = useIntl();
  const { value, error, onChange } = useField<RelationValue[]>(name);
  const [search, setSearch] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [options, setOptions] = React.useState<RelationValue[]>([]);
  const [searchRelations, { data, isFetching }] = useLazySearchRelationsQuery();

  const field = name.split('.').pop() as string;
  const relations = React.useMemo(() => (Array.isArray(value) ? value : []), [value]);
  const isToOne = TO_ONE_RELATIONS.includes(
    attribute?.metadata?.relationType ?? attribute?.relation ?? ''
  );
  const isFull = isToOne && relations.length > 0;

  const load = React.useCallback(
    (query: string, nextPage: number) => {
      searchRelations({
        field,
        _q: query || undefined,
        page: nextPage,
        pageSize: PAGE_SIZE,
        omit: relations.map((relation) => relation.documentId),
      })
        .unwrap()
        .then((response) => {
          setPage(nextPage);
          setOptions((prev) =>
            nextPage === 1 ? response.results : [...prev, ...response.results]
          );
        })
        .catch(() => {
          setOptions([]);
        });
    },
    [field, relations, searchRelations]
  );

  React.useEffect(() => {
    const timeout = setTimeout(() => load(search, 1), 300);

    return () => clearTimeout(timeout);
  }, [search, load]);

  const handleSelect = (documentId?: string) => {
    const option = options.find((item) => item.documentId === documentId);

    if (!option) {
      return;
    }

    onChange(name, isToOne ? [option] : [...relations, option]);
    setSearch('');
  };

  const handleRemove = (documentId: string) => {
    onChange(
      name,
      relations.filter((relation) => relation.documentId !== documentId)
    );
  };

  const pagination = data?.pagination;
  const hasMoreItems = Boolean(pagination && pagination.page < pagination.pageCount);

  return (
    <Field.Root name={name} error={error} hint={hint} required={required}>
      <Field.Label>{label}</Field.Label>
      <Combobox
        autocomplete="list"
        disabled={disabled || isFull}
        placeholder={
          isFull
            ? formatMessage({
                id: getTranslation('relation.full'),
                defaultMessage: 'Remove the current relation to select another one',
              })
            : (placeholder ??
              formatMessage({
                id: getTranslation('relation.placeholder'),
                defaultMessage: 'Add or create a relation',
              }))
        }
        value={undefined}
        textValue={search}
        onTextValueChange={setSearch}
        onChange={handleSelect}
        loading={isFetching}
        hasMoreItems={hasMoreItems}
        onLoadMore={() => load(search, page + 1)}
        noOptionsMessage={() =>
          formatMessage({
            id: getTranslation('relation.empty'),
            defaultMessage: 'No relations available',
          })
        }
      >
        {options.map((option) => (
          <ComboboxOption key={option.documentId} value={option.documentId}>
            {option.label}
          </ComboboxOption>
        ))}
      </Combobox>
      {relations.length > 0 && (
        <Box marginTop={2} hasRadius borderColor="neutral200" background="neutral0">
          {relations.map((relation) => (
            <Flex
              key={relation.documentId}
              justifyContent="space-between"
              paddingLeft={4}
              paddingRight={2}
              paddingTop={2}
              paddingBottom={2}
              gap={2}
            >
              <Typography textColor="neutral800" ellipsis>
                {relation.label}
              </Typography>
              <IconButton
                variant="ghost"
                label={formatMessage({
                  id: getTranslation('relation.remove'),
                  defaultMessage: 'Remove',
                })}
                disabled={disabled}
                onClick={() => handleRemove(relation.documentId)}
              >
                <Cross />
              </IconButton>
            </Flex>
          ))}
        </Box>
      )}
      <Field.Hint />
      <Field.Error />
    </Field.Root>
  );
};

export { RelationInput };
