import { useIntl } from 'react-intl';
import { Field, TextInput } from '@strapi/design-system';

import { getTranslation } from '../../utils/getTranslation';

interface UnsupportedInputProps {
  name: string;
  label: string;
  type: string;
}

const UnsupportedInput = ({ name, label, type }: UnsupportedInputProps) => {
  const { formatMessage } = useIntl();

  return (
    <Field.Root
      name={name}
      hint={formatMessage(
        {
          id: getTranslation('field.unsupported'),
          defaultMessage: 'The "{type}" field type is not supported.',
        },
        { type }
      )}
    >
      <Field.Label>{label}</Field.Label>
      <TextInput disabled value="" />
      <Field.Hint />
    </Field.Root>
  );
};

export { UnsupportedInput };
