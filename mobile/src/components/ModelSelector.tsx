import { CheckCircle } from 'phosphor-react-native';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { MODEL_IDS, MODEL_NAMES, type ModelId } from '../diagnosis/modelConfig';
import type { Strings } from '../i18n/strings';
import { colors } from '../theme';
import { Muted } from './Typography';

type ModelSelectorProps = {
  modelId: ModelId;
  strings: Strings;
  disabled: boolean;
  loading: boolean;
  onSelect: (modelId: ModelId) => void;
};

export function ModelSelector({ modelId, strings, disabled, loading, onSelect }: ModelSelectorProps) {
  return (
    <View className="gap-2">
      <View accessibilityRole="radiogroup" accessibilityLabel={strings.chooseModel} className="gap-2">
        {MODEL_IDS.map((id) => {
          const selected = id === modelId;
          return (
            <Pressable
              key={id}
              accessibilityRole="radio"
              accessibilityLabel={`${MODEL_NAMES[id]}. ${strings.modelDescriptions[id]}`}
              accessibilityState={{ checked: selected, disabled }}
              disabled={disabled}
              onPress={() => onSelect(id)}
              className={`min-h-16 justify-center gap-1 rounded-control p-3 ${selected ? 'bg-healthy-soft' : 'bg-surface shadow-sm'} ${disabled ? 'opacity-40' : ''}`}
            >
              <View className="flex-row items-center gap-2">
                <Text className="flex-1 text-base font-semibold text-ink">{MODEL_NAMES[id]}</Text>
                {selected && <CheckCircle size={20} weight="fill" color={colors.accent} />}
              </View>
              <Muted>{strings.modelDescriptions[id]}</Muted>
            </Pressable>
          );
        })}
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
