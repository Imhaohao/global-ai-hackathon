import { ArrowCounterClockwise, Camera, SpeakerHigh, SpeakerSlash } from 'phosphor-react-native';
import { Image, ScrollView, Text, View } from 'react-native';

import { Button } from '../components/Button';
import { SeverityBadge } from '../components/SeverityBadge';
import { Body, Muted, SectionHeading, Title } from '../components/Typography';
import { useReadAloud } from '../components/useReadAloud';
import type { Diagnosis } from '../diagnosis/classifyLeaf';
import { severityOf } from '../diagnosis/conditions';
import type { Strings } from '../i18n/strings';

type ResultScreenProps = {
  strings: Strings;
  photoUri: string;
  diagnosis: Diagnosis;
  onCheckAnother: () => void;
};

function LeafPhotoCard({ photoUri }: { photoUri: string }) {
  return (
    <Image
      source={{ uri: photoUri }}
      className="aspect-square w-40 rounded-card bg-hairline"
      accessibilityIgnoresInvertColors
    />
  );
}

function UnclearResult({ strings, photoUri, onCheckAnother }: Omit<ResultScreenProps, 'diagnosis'>) {
  return (
    <View className="flex-1 justify-between gap-6 px-5 pb-6 pt-6">
      <View className="gap-5">
        <LeafPhotoCard photoUri={photoUri} />
        <Title>{strings.unclearTitle}</Title>
        <Body>{strings.unclearBody}</Body>
      </View>
      <Button label={strings.tryAgain} icon={Camera} onPress={onCheckAnother} />
    </View>
  );
}

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

export function ResultScreen({ strings, photoUri, diagnosis, onCheckAnother }: ResultScreenProps) {
  const disease = strings.diseases[diagnosis.condition];
  const severity = severityOf(diagnosis.condition);
  const spokenText = [disease.name, disease.look, ...disease.actions].join(' ');
  const readAloud = useReadAloud(spokenText, strings.speechLanguage);

  if (diagnosis.confidence === 'unclear') {
    return <UnclearResult strings={strings} photoUri={photoUri} onCheckAnother={onCheckAnother} />;
  }

  return (
    <View className="flex-1">
      <ScrollView contentContainerClassName="gap-8 px-5 pb-8 pt-6">
        <View className="gap-4">
          <LeafPhotoCard photoUri={photoUri} />
          <SeverityBadge severity={severity} label={strings.severity[severity]} />
          <Title>{disease.name}</Title>
          {disease.urgencyReason && <Muted>{disease.urgencyReason}</Muted>}
          {diagnosis.confidence === 'possible' && (
            <View className="rounded-control bg-watch-soft p-4">
              <Body className="text-watch">{strings.notSure}</Body>
            </View>
          )}
        </View>

        <View className="gap-2">
          <SectionHeading>{strings.whatYouSee}</SectionHeading>
          <Body>{disease.look}</Body>
          {disease.tellApart && <Muted>{disease.tellApart}</Muted>}
        </View>

        <View className="gap-4">
          <SectionHeading>{strings.whatToDo}</SectionHeading>
          <StepList steps={disease.actions} />
        </View>
      </ScrollView>

      <View className="gap-3 bg-paper px-5 pb-6 pt-3">
        {readAloud.isAvailable && (
          <Button
            label={readAloud.isSpeaking ? strings.stopReading : strings.readAloud}
            icon={readAloud.isSpeaking ? SpeakerSlash : SpeakerHigh}
            variant="secondary"
            onPress={readAloud.toggle}
          />
        )}
        <Button label={strings.checkAnother} icon={ArrowCounterClockwise} onPress={onCheckAnother} />
      </View>
    </View>
  );
}
