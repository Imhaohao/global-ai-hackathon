import { ArrowLeft, ChatText, Info, SpeakerHigh, SpeakerSlash } from 'phosphor-react-native';
import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import type { SeedCheckCopy } from '../../../shared/src/seedCheck.ts';
import { Disclosure } from '../components/Disclosure';
import { StepPager } from '../components/StepPager';
import { Button } from '../components/Button';
import { PillButton } from '../components/PillButton';
import { SeedPacketSticker } from '../components/SeedPacketSticker';
import { Body, Muted, Title } from '../components/Typography';
import { useReadAloud } from '../components/useReadAloud';
import { fillTemplate, type Strings } from '../i18n/strings';
import { openSeedCodeMessage } from './textSeedCode';

type SeedCheckScreenProps = {
  strings: Strings;
  copy: SeedCheckCopy;
  phone: string;
  onBack: () => void;
};

function ReadStepsAloud({ strings, steps }: { strings: Strings; steps: string[] }) {
  const readAloud = useReadAloud(steps.join(' '), strings.speechLanguage);
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

function TypeTheNumberYourself({ strings, phone }: { strings: Strings; phone: string }) {
  return (
    <View accessibilityLiveRegion="polite" className="items-center gap-2 rounded-card bg-watch-soft p-5">
      <Body className="text-center text-watch">{strings.seedCheckSmsUnavailable}</Body>
      <Text selectable className="text-2xl font-bold text-ink">
        {phone}
      </Text>
    </View>
  );
}

export function SeedCheckScreen({ strings, copy, phone, onBack }: SeedCheckScreenProps) {
  const [isSmsUnavailable, setIsSmsUnavailable] = useState(false);
  const textTheCode = async () => setIsSmsUnavailable((await openSeedCodeMessage(phone)) === 'unavailable');
  return (
    <ScrollView contentContainerClassName="gap-6 px-5 pb-8 pt-2">
      <View className="items-start">
        <PillButton label={strings.back} icon={ArrowLeft} onPress={onBack} />
      </View>
      <Title>{strings.seedCheckTitle}</Title>
      <SeedPacketSticker />
      <StepPager steps={copy.steps} strings={strings} />
      <ReadStepsAloud strings={strings} steps={copy.steps} />
      <Button
        label={fillTemplate(strings.seedCheckTextButton, { phone })}
        icon={ChatText}
        onPress={textTheCode}
      />
      {isSmsUnavailable && <TypeTheNumberYourself strings={strings} phone={phone} />}
      <Disclosure title={strings.seedDetails} icon={Info}>
        <Muted>{copy.result}</Muted>
        <Muted>{copy.coverage}</Muted>
      </Disclosure>
    </ScrollView>
  );
}
