import { ArrowLeft, ArrowRight, Check } from 'phosphor-react-native';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Text, View } from 'react-native';

import { fillTemplate, type Strings } from '../i18n/strings';
import { colors } from '../theme';
import { Button } from './Button';
import { IconButton } from './IconButton';
import { Body } from './Typography';

export function StepPager({ steps, strings, lastStepActions }: { steps: string[]; strings: Strings; lastStepActions?: ReactNode }) {
  const [index, setIndex] = useState(0);
  const currentIndex = Math.min(index, steps.length - 1);
  const instructionRef = useRef<View | null>(null);
  const previousIndex = useRef(currentIndex);

  useEffect(() => {
    const indexChanged = previousIndex.current !== currentIndex;
    previousIndex.current = currentIndex;
    const instruction = instructionRef.current;
    if (!indexChanged || instruction === null) return;
    AccessibilityInfo.sendAccessibilityEvent(instruction, 'focus');
  }, [currentIndex]);

  if (steps.length === 0) return null;

  const stepNumber = currentIndex + 1;
  const stepCountLabel = fillTemplate(strings.stepCount, { number: stepNumber, count: steps.length });

  return (
    <View className="gap-5 rounded-card bg-surface p-5">
      <View
        className="flex-row items-center gap-3"
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={stepCountLabel}
        accessibilityValue={{ min: 1, max: steps.length, now: stepNumber }}
      >
        {steps.map((step, stepIndex) => (
          <View
            key={step}
            accessible={false}
            accessibilityElementsHidden
            importantForAccessibility="no"
            className={`flex-1 ${stepIndex <= currentIndex ? 'h-3 rounded-full bg-accent' : 'h-2 rounded-none bg-hairline'}`}
          />
        ))}
        <Text accessible={false} accessibilityElementsHidden importantForAccessibility="no" className="text-base font-semibold text-ink">
          {`${stepNumber}/${steps.length}`}
        </Text>
      </View>
      <View
        ref={instructionRef}
        accessible
        accessibilityRole="text"
        accessibilityLabel={steps[currentIndex]}
        accessibilityLiveRegion="polite"
      >
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
            <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
              <Check size={28} weight="bold" color={colors.accent} />
            </View>
          )}
        </View>
      )}
      {currentIndex === steps.length - 1 && lastStepActions}
    </View>
  );
}
