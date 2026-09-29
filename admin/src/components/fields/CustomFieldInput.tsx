import * as React from 'react';
import { useField, useStrapiApp } from '@strapi/strapi/admin';
import { Loader } from '@strapi/design-system';

import { PLUGIN_ID } from '../../pluginId';
import type { AttributeSchema } from '../../types';
import { UnsupportedInput } from './UnsupportedInput';

interface CustomFieldInputProps {
  name: string;
  label: string;
  hint?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  customField: string;
  attribute?: AttributeSchema;
}

type LazyInput = React.LazyExoticComponent<React.ComponentType<Record<string, unknown>>>;

// Lazy components are cached so they are not re-created on each render or panel.
const lazyInputs = new Map<string, LazyInput>();

const CustomFieldInput = ({ customField: uid, attribute, ...props }: CustomFieldInputProps) => {
  const getCustomField = useStrapiApp(PLUGIN_ID, (state) => state.customFields.get);
  const field = useField(props.name);
  const customField = getCustomField(uid);

  if (!customField) {
    return <UnsupportedInput {...props} type={uid} />;
  }

  if (!lazyInputs.has(uid)) {
    lazyInputs.set(
      uid,
      React.lazy(
        customField.components.Input as () => Promise<{ default: React.ComponentType<any> }>
      )
    );
  }

  const Input = lazyInputs.get(uid)!;

  return (
    <React.Suspense fallback={<Loader small />}>
      <Input
        {...props}
        {...field}
        type={customField.type}
        attribute={{ type: customField.type, customField: uid, ...attribute }}
      />
    </React.Suspense>
  );
};

export { CustomFieldInput };
