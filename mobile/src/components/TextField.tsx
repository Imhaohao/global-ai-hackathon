import { TextInput, type TextInputProps } from 'react-native';

import { colors } from '../theme';

type TextFieldProps = Pick<
  TextInputProps,
  'value' | 'onChangeText' | 'onBlur' | 'placeholder' | 'keyboardType' | 'autoFocus' | 'onSubmitEditing' | 'returnKeyType'
  | 'autoComplete' | 'textContentType' | 'maxLength' | 'editable' | 'autoCapitalize' | 'accessibilityHint'
> & { accessibilityLabel: string };

export function TextField(props: TextFieldProps) {
  return (
    <TextInput
      {...props}
      placeholderTextColor={colors['ink-muted']}
      className="min-h-14 rounded-control border border-hairline bg-surface px-4 text-lg text-ink"
    />
  );
}
