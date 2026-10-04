import { forwardRef, type Ref } from 'react';
import { Text, TextInput, type TextInputProps, View } from 'react-native';

import { colors } from '../theme';
import { CONTROL_FOCUS_STYLE, useControlFocus } from './useControlFocus';

type TextFieldProps = Pick<
  TextInputProps,
  'value' | 'onChangeText' | 'onBlur' | 'placeholder' | 'keyboardType' | 'autoFocus' | 'onSubmitEditing' | 'returnKeyType'
  | 'autoComplete' | 'textContentType' | 'maxLength' | 'editable' | 'autoCapitalize' | 'accessibilityHint' | 'onFocus'
> & { accessibilityLabel: string; error?: string; inputRef?: Ref<TextInput> };

function assignRef<T>(ref: Ref<T> | undefined, value: T | null) {
  if (typeof ref === 'function') {
    ref(value);
  } else if (ref) {
    ref.current = value;
  }
}

export const TextField = forwardRef<TextInput, TextFieldProps>(function TextField(
  { accessibilityHint, editable = true, error, inputRef, onBlur, onFocus, ...props },
  forwardedRef,
) {
  const focus = useControlFocus();
  const handleFocus: NonNullable<TextInputProps['onFocus']> = (event) => {
    focus.onFocus();
    onFocus?.(event);
  };
  const handleBlur: NonNullable<TextInputProps['onBlur']> = (event) => {
    focus.onBlur();
    onBlur?.(event);
  };
  const inputAccessibilityHint = [accessibilityHint, error].filter(Boolean).join(' ') || undefined;

  return (
    <View className="gap-2">
      <TextInput
        {...props}
        ref={(instance) => {
          assignRef(forwardedRef, instance);
          assignRef(inputRef, instance);
        }}
        accessibilityHint={inputAccessibilityHint}
        accessibilityState={{ disabled: !editable }}
        editable={editable}
        onBlur={handleBlur}
        onFocus={handleFocus}
        placeholderTextColor={colors['ink-muted']}
        style={focus.isFocused ? CONTROL_FOCUS_STYLE : undefined}
        className={`min-h-14 rounded-control border border-field-border bg-surface px-4 text-lg text-ink ${editable ? '' : 'opacity-50'}`}
      />
      {error ? (
        <Text accessibilityRole="alert" accessibilityLiveRegion="polite" className="text-base leading-normal text-sick">
          {error}
        </Text>
      ) : null}
    </View>
  );
});

TextField.displayName = 'TextField';
