import { CalendarCheck, SpeakerHigh, SpeakerSlash } from 'phosphor-react-native';
import { useEffect, useRef } from 'react';
import { ScrollView, Text, View } from 'react-native';

import type { ActionCard, AppLanguage, Observation } from '../../../shared/src/contract.ts';
import { DecisionHeader } from '../components/DecisionHeader';
import { Disclosure } from '../components/Disclosure';
import { LeafSlots } from '../components/LeafSlots';
import { PillButton } from '../components/PillButton';
import { Body, SectionHeading } from '../components/Typography';
import { useKeyboardHeight } from '../components/useKeyboardHeight';
import { useReadAloud } from '../components/useReadAloud';
import { fillTemplate, type Strings } from '../i18n/strings';
import { colors } from '../theme';
import { FarmSectionPicker } from './FarmSectionPicker';
import { OfficerActions } from './OfficerActions';
import { formatRecheckDate } from './recheckDate';
import type { OfficerSendResult } from './sendCaseToOfficer';

type ActionCardScreenProps = {
  strings: Strings;
  language: AppLanguage;
  card: ActionCard;
  observation: Observation;
  photoUris: string[];
  farmSections: string[];
  savedOfficerPhone?: string;
  onChooseFarmSection: (section: string | undefined) => void;
  onAddFarmSection: (name: string) => void;
  onSaveOfficerPhone: (phone: string) => void;
  onSendCase: (phone: string) => Promise<OfficerSendResult>;
  onCheckAnother: () => void;
};

function StepList({ steps }: { steps: string[] }) {
  return (
    <View className="gap-4">
      {steps.map((step, index) => (
        <View key={step} className="flex-row gap-4">
          <View className="h-9 w-9 items-center justify-center rounded-full bg-accent">
            <Text className="text-base font-bold text-on-accent">{index + 1}</Text>
          </View>
          <Body className="flex-1">{step}</Body>
        </View>
      ))}
    </View>
  );
}

function RecheckRow({ text }: { text: string }) {
  return (
    <View className="flex-row items-center gap-3">
      <CalendarCheck size={28} weight="duotone" color={colors.accent} />
      <Text className="flex-1 text-lg font-semibold text-ink">{text}</Text>
    </View>
  );
}

function ReadAloudButton({ strings, card }: { strings: Strings; card: ActionCard }) {
  const readAloud = useReadAloud([card.headline, ...card.doNow].join(' '), strings.speechLanguage);
  if (!readAloud.isAvailable) return null;
  return (
    <View className="items-start">
      <PillButton
        label={readAloud.isSpeaking ? strings.stopReading : strings.readAloud}
        icon={readAloud.isSpeaking ? SpeakerSlash : SpeakerHigh}
        onPress={readAloud.toggle}
      />
    </View>
  );
}

function WhatElseCouldItBe({ strings, items }: { strings: Strings; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <Disclosure title={strings.whatElse}>
      {items.map((item) => (
        <Body key={item}>{item}</Body>
      ))}
    </Disclosure>
  );
}

export function ActionCardScreen(props: ActionCardScreenProps) {
  const { strings, language, card, observation, photoUris } = props;
  const recheckText = fillTemplate(strings.recheckOn, {
    date: formatRecheckDate(observation.capturedAt, card.recheckInDays, language),
  });
  const scrollRef = useRef<ScrollView>(null);
  const keyboardHeight = useKeyboardHeight();
  useEffect(() => {
    if (keyboardHeight > 0) scrollRef.current?.scrollToEnd({ animated: true });
  }, [keyboardHeight]);
  return (
    <ScrollView
      ref={scrollRef}
      contentContainerClassName="gap-6 px-5 pt-4"
      contentContainerStyle={{ paddingBottom: 32 + keyboardHeight }}
      keyboardShouldPersistTaps="handled"
    >
      <DecisionHeader decision={card.decision} urgency={card.urgency} headline={card.headline} />
      <ReadAloudButton strings={strings} card={card} />
      {card.doNow.length > 0 && (
        <View className="gap-4">
          <SectionHeading>{strings.whatToDo}</SectionHeading>
          <StepList steps={card.doNow} />
        </View>
      )}
      <RecheckRow text={recheckText} />
      <WhatElseCouldItBe strings={strings} items={card.whatElseCouldItBe} />
      {photoUris.length > 0 && (
        <LeafSlots
          photoUris={photoUris}
          readings={observation.check.readings}
          verdict={observation.check.verdict}
          slotCount={photoUris.length}
          accessibilityLabel={fillTemplate(strings.leavesTaken, { count: photoUris.length, max: photoUris.length })}
        />
      )}
      <FarmSectionPicker
        strings={strings}
        sections={props.farmSections}
        selected={observation.farmSection}
        onChoose={props.onChooseFarmSection}
        onAdd={props.onAddFarmSection}
      />
      <OfficerActions
        strings={strings}
        card={card}
        savedOfficerPhone={props.savedOfficerPhone}
        onSaveOfficerPhone={props.onSaveOfficerPhone}
        onSendCase={props.onSendCase}
        onCheckAnother={props.onCheckAnother}
      />
    </ScrollView>
  );
}
