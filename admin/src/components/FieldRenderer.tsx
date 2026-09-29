import { useIntl } from 'react-intl';
import { InputRenderer, useStrapiApp } from '@strapi/strapi/admin';

import { PLUGIN_ID } from '../pluginId';
import type { NormalizedInput } from '../utils/fields-layout';
import { CustomFieldInput } from './fields/CustomFieldInput';
import { RelationInput } from './fields/RelationInput';
import { UnsupportedInput } from './fields/UnsupportedInput';

const NUMBER_TYPES = ['integer', 'biginteger', 'float', 'decimal'];

/**
 * Maps the input types documented for `layouts` to the types of the admin
 * `InputRenderer`.
 */
const getRendererType = (input: NormalizedInput): string | null => {
  const schemaType = input.attribute?.type;

  switch (input.type) {
    case 'text':
    case 'string':
      return 'string';
    case 'textarea':
    case 'wysiwyg':
    case 'richtext':
      return 'text';
    case 'bool':
    case 'boolean':
      return 'boolean';
    case 'checkbox':
      return 'checkbox';
    case 'number':
      return schemaType && NUMBER_TYPES.includes(schemaType) ? schemaType : 'float';
    case 'select':
    case 'enumeration':
      return 'enumeration';
    case 'integer':
    case 'biginteger':
    case 'float':
    case 'decimal':
    case 'date':
    case 'time':
    case 'datetime':
    case 'email':
    case 'password':
    case 'json':
      return input.type;
    default:
      return null;
  }
};

interface FieldRendererProps {
  name: string;
  input: NormalizedInput;
  disabled?: boolean;
}

const FieldRenderer = ({ name, input, disabled }: FieldRendererProps) => {
  const { formatMessage } = useIntl();
  const fields = useStrapiApp(PLUGIN_ID, (state) => state.fields);

  const props = {
    name,
    label: formatMessage(input.label),
    hint: input.hint ? formatMessage(input.hint) : undefined,
    placeholder: input.placeholder ? formatMessage(input.placeholder) : undefined,
    required: input.required,
    disabled,
  };

  if (input.type === 'customField' || input.customField) {
    return input.customField ? (
      <CustomFieldInput {...props} customField={input.customField} attribute={input.attribute} />
    ) : (
      <UnsupportedInput {...props} type={input.type} />
    );
  }

  if (input.type === 'relation') {
    return <RelationInput {...props} attribute={input.attribute} />;
  }

  if (input.type === 'media') {
    const MediaInput = fields.media as React.ComponentType<Record<string, unknown>> | undefined;

    return MediaInput ? (
      <MediaInput
        {...props}
        attribute={{
          multiple: Boolean(input.attribute?.multiple),
          allowedTypes: input.attribute?.allowedTypes ?? null,
        }}
      />
    ) : (
      <UnsupportedInput {...props} type={input.type} />
    );
  }

  // Types registered by other plugins, e.g. a custom WYSIWYG editor.
  const LibraryInput = fields[input.type] as
    React.ComponentType<Record<string, unknown>> | undefined;

  if (LibraryInput) {
    return <LibraryInput {...props} type={input.type} attribute={input.attribute} />;
  }

  const type = getRendererType(input);

  if (!type) {
    return <UnsupportedInput {...props} type={input.type} />;
  }

  if (type === 'enumeration') {
    return (
      <InputRenderer
        {...props}
        type="enumeration"
        options={input.options.map((option) => ({
          value: option.value,
          label: formatMessage(option.label),
        }))}
      />
    );
  }

  return <InputRenderer {...(props as any)} type={type} step={input.step} />;
};

export { FieldRenderer };
