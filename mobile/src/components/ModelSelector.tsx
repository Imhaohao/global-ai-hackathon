import { CheckCircle } from 'phosphor-react-native';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { MODEL_IDS, MODEL_NAMES, type ModelId } from '../diagnosis/modelConfig';
import type { Strings } from '../i18n/strings';
import { colors } from '../theme';
import { Muted } from './Typography';
import { CONTROL_FOCUS_STYLE, useControlFocus } from './useControlFocus';

type ModelSelectorProps = {
  modelId: ModelId;
  strings: Strings;
  disabled: boolean;
  loading: boolean;
  onSelect: (modelId: ModelId) => void;
};

function ModelOption({ id, selected, description, disabled, onSelect }: {
  id: ModelId;
  selected: boolean;
  description: string;
  disabled: boolean;
  onSelect: (modelId: ModelId) => void;
}) {
  const focus = useControlFocus();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={`${MODEL_NAMES[id]}. ${description}`}
      accessibilityState={{ checked: selected, disabled }}
      disabled={disabled}
      onPress={() => onSelect(id)}
      onFocus={focus.onFocus}
      onBlur={focus.onBlur}
      style={focus.isFocused ? CONTROL_FOCUS_STYLE : undefined}
      className={`min-h-16 justify-center gap-1 rounded-control p-3 active:bg-hairline ${selected || focus.isFocused ? 'bg-healthy-soft' : 'bg-surface shadow-sm'} ${disabled ? 'opacity-40' : ''}`}
    >
      <View className="flex-row items-center gap-2">
        <Text className="flex-1 text-base font-semibold text-ink">{MODEL_NAMES[id]}</Text>
        {selected && (
          <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <CheckCircle size={20} weight="fill" color={colors.accent} />
          </View>
        )}
      </View>
      <Muted>{description}</Muted>
    </Pressable>
  );
}

export function ModelSelector({ modelId, strings, disabled, loading, onSelect }: ModelSelectorProps) {
  return (
    <View className="gap-2">
      <View accessibilityRole="radiogroup" accessibilityLabel={strings.chooseModel} className="gap-2">
        {MODEL_IDS.map((id) => (
          <ModelOption
            key={id}
            id={id}
            selected={id === modelId}
            description={strings.modelDescriptions[id]}
            disabled={disabled}
            onSelect={onSelect}
          />
        ))}
      </View>
      {loading && (
        <View accessibilityLiveRegion="polite" className="flex-row items-center gap-2">
          <ActivityIndicator size="small" color={colors.accent} />
          <Muted>{strings.modelLoading}</Muted>
        </View>
      )}
    </View>
  );
}
