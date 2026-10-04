import { Camera, CalendarCheck, Question, SpeakerHigh, SpeakerSlash } from 'phosphor-react-native';
import { useEffect, useRef } from 'react';
import { ScrollView, Text, View } from 'react-native';

import type { ActionCard, AppLanguage, Observation } from '../../../shared/src/contract.ts';
import { DecisionHeader } from '../components/DecisionHeader';
import { Disclosure } from '../components/Disclosure';
import { LeafSlots } from '../components/LeafSlots';
import { PillButton } from '../components/PillButton';
import { StepPager } from '../components/StepPager';
import { Body, Muted } from '../components/Typography';
import { useKeyboardHeight } from '../components/useKeyboardHeight';
import { useReadAloud } from '../components/useReadAloud';
import { MODEL_NAMES, type ModelId } from '../diagnosis/modelConfig';
import { fillTemplate, type Strings } from '../i18n/strings';
import { colors } from '../theme';
import { whatToBuy } from '../../../shared/src/whatToBuy.ts';
import { WhatToBuy } from '../components/WhatToBuy';
import { FarmSectionPicker } from './FarmSectionPicker';
import { CheckAnotherButton, OfficerActions } from './OfficerActions';
import { formatRecheckDate } from './recheckDate';
import type { OfficerSendResult } from './sendCaseToOfficer';

type ActionCardScreenProps = {
  strings: Strings;
  language: AppLanguage;
  card: ActionCard;
  modelId: ModelId;
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

function RecheckRow({ text }: { text: string }) {
  return (
    <View className="flex-row items-center gap-3">
      <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <CalendarCheck size={28} weight="duotone" color={colors.accent} />
      </View>
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
    <Disclosure title={strings.whatElse} icon={Question}>
      {items.map((item) => (
        <Body key={item}>{item}</Body>
      ))}
    </Disclosure>
  );
}

function CaseDetails({
  strings,
  modelName,
  photoUris,
  observation,
  farmSections,
  onChooseFarmSection,
  onAddFarmSection,
}: {
  strings: Strings;
  modelName: string;
  photoUris: string[];
  observation: Observation;
  farmSections: string[];
  onChooseFarmSection: (section: string | undefined) => void;
  onAddFarmSection: (name: string) => void;
}) {
  return (
    <Disclosure title={strings.caseDetails} icon={Camera}>
      {photoUris.length > 0 && (
        <LeafSlots
            photoUris={photoUris}
            readings={observation.check.readings}
            verdict={observation.check.verdict}
            slotCount={photoUris.length}
            strings={strings}
            accessibilityLabel={fillTemplate(strings.leavesTaken, { count: photoUris.length, max: photoUris.length })}
          />
      )}
      <FarmSectionPicker
        strings={strings}
        sections={farmSections}
        selected={observation.farmSection}
        onChoose={onChooseFarmSection}
        onAdd={onAddFarmSection}
      />
      <Muted>
        {strings.modelUsed} {modelName}
      </Muted>
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
    if (keyboardHeight > 0) scrollRef.current?.scrollToEnd({ animated: false });
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
      <StepPager steps={card.doNow} strings={strings} />
      <WhatToBuy advice={whatToBuy(card)} strings={strings} />
      <OfficerActions
        strings={strings}
        card={card}
        savedOfficerPhone={props.savedOfficerPhone}
        onSaveOfficerPhone={props.onSaveOfficerPhone}
        onSendCase={props.onSendCase}
      />
      <RecheckRow text={recheckText} />
      <WhatElseCouldItBe strings={strings} items={card.whatElseCouldItBe} />
      <CaseDetails
        strings={strings}
        modelName={MODEL_NAMES[props.modelId]}
        photoUris={photoUris}
        observation={observation}
        farmSections={props.farmSections}
        onChooseFarmSection={props.onChooseFarmSection}
        onAddFarmSection={props.onAddFarmSection}
      />
      <CheckAnotherButton strings={strings} card={card} onPress={props.onCheckAnother} />
    </ScrollView>
  );
}
