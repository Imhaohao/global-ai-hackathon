import { ArrowLeft, ArrowRight, Check } from 'phosphor-react-native';
import { useState, type ReactNode } from 'react';
import { View } from 'react-native';

import type { Strings } from '../i18n/strings';
import { colors } from '../theme';
import { Button } from './Button';
import { IconButton } from './IconButton';
import { Body } from './Typography';

export function StepPager({ steps, strings, lastStepActions }: { steps: string[]; strings: Strings; lastStepActions?: ReactNode }) {
  const [index, setIndex] = useState(0);
  const currentIndex = Math.min(index, steps.length - 1);
  if (steps.length === 0) return null;
  return (
    <View className="gap-5 rounded-card bg-surface p-5">
      <View className="flex-row items-center gap-2" accessible accessibilityLabel={`${currentIndex + 1} / ${steps.length}`}>
        {steps.map((step, stepIndex) => (
          <View
            key={step}
            className={`h-2 flex-1 rounded-full ${stepIndex <= currentIndex ? 'bg-accent' : 'bg-hairline'}`}
          />
        ))}
      </View>
      <View accessibilityLiveRegion="polite">
        <Body>{steps[currentIndex]}</Body>
      </View>
      {steps.length > 1 && (
        <View className="flex-row items-center justify-between gap-3">
          <IconButton
            label={strings.previousStep}
            icon={ArrowLeft}
            disabled={currentIndex === 0}
            onPress={() => setIndex(currentIndex - 1)}
          />
          {currentIndex < steps.length - 1 ? (
            <Button label={strings.nextStep} icon={ArrowRight} variant="secondary" onPress={() => setIndex(currentIndex + 1)} />
          ) : (
            <Check size={28} weight="bold" color={colors.accent} />
          )}
        </View>
      )}
      {currentIndex === steps.length - 1 && lastStepActions}
    </View>
  );
}
