import {
  ArrowCounterClockwise,
  ArrowRight,
  Camera,
  CheckCircle,
  Gear,
  ImageSquare,
  Translate,
  Warning,
  Info,
  WifiSlash,
} from 'phosphor-react-native';
import { useState } from 'react';
import { Image, Linking, ScrollView, Text, View } from 'react-native';

import type { LeafReading, PlantCheck, PlantVerdict } from '../../../shared/src/contract.ts';
import { MAX_LEAVES_PER_PLANT } from '../../../shared/src/plantVote.ts';
import { IconButton } from '../components/IconButton';
import { LeafEmblem, LeafIcon, LeafLoader } from '../components/leaf/Leaf';
import { Button } from '../components/Button';
import { ModelSelector } from '../components/ModelSelector';
import { LeafSlots } from '../components/LeafSlots';
import { Body, Muted, Title } from '../components/Typography';
import type { LeafPhoto } from '../diagnosis/classifyLeaf';
import type { ModelId } from '../diagnosis/modelConfig';
import { getQualityGuidance } from '../diagnosis/qualityGuidance';
import type { PhotoSource } from '../diagnosis/pickLeafPhoto';
import { fillTemplate, type Strings } from '../i18n/strings';
import { colors } from '../theme';
import { leafProblemOf } from './leafMarks';

export type CaptureProblem = 'cameraBlocked' | 'photoFailed' | 'modelFailed';

type CaptureScreenProps = {
  strings: Strings;
  photos: LeafPhoto[];
  check: PlantCheck | null;
  isChecking: boolean;
  problem?: CaptureProblem;
  canCheck: boolean;
  modelId: ModelId;
  modelLoading: boolean;
  onSelectModel: (modelId: ModelId) => void;
  onRetryModel: () => void;
  onTakeLeaf: (source: PhotoSource, replaceIndex?: number) => void;
  onFinish: () => void;
  isFinishing?: boolean;
  onGoHome: () => void;
  onSwitchLanguage: () => void;
};

function ProblemNotice({ strings, problem }: { strings: Strings; problem: CaptureProblem }) {
  return (
    <View accessibilityLiveRegion="polite" className="gap-3 rounded-control bg-sick-soft p-4">
      <Body className="text-sick">{strings[problem]}</Body>
      {problem === 'cameraBlocked' && (
        <Button label={strings.openSettings} icon={Gear} variant="secondary" onPress={() => Linking.openSettings()} />
      )}
    </View>
  );
}

type VerdictTone = { container: string; text: string; color: string; icon: typeof Warning };

const WATCH_TONE: VerdictTone = { container: 'bg-watch-soft', text: 'text-watch', color: colors.watch, icon: Warning };
const HEALTHY_TONE: VerdictTone = {
  container: 'bg-healthy-soft',
  text: 'text-healthy',
  color: colors.healthy,
  icon: CheckCircle,
};

function verdictTitle(strings: Strings, verdict: PlantVerdict): string {
  if (verdict.kind === 'answer') {
    return strings.leavesReady;
  }
  if (verdict.kind === 'needsPerson' && verdict.reason === 'leavesDisagree') return strings.leavesDisagreeTitle;
  return strings.retakeTitle;
}

function VerdictPanel({ strings, verdict }: { strings: Strings; verdict: PlantVerdict }) {
  const tone = verdict.kind === 'answer' ? HEALTHY_TONE : WATCH_TONE;
  const ToneIcon = tone.icon;
  return (
    <View accessibilityLiveRegion="polite" className={`gap-2 rounded-control p-4 ${tone.container}`}>
      <View className="flex-row items-center gap-3">
        <ToneIcon size={28} weight="fill" color={tone.color} />
        <Text className={`flex-1 text-lg font-semibold ${tone.text}`}>{verdictTitle(strings, verdict)}</Text>
      </View>
    </View>
  );
}

type ProblemLeafRowProps = {
  strings: Strings;
  number: number;
  photo: LeafPhoto;
  reading: LeafReading;
  onRetake: () => void;
  disabled: boolean;
};

function ProblemLeafRow({ strings, number, photo, reading, onRetake, disabled }: ProblemLeafRowProps) {
  const reason = reading.qualityIssue
    ? getQualityGuidance(strings, reading.qualityIssue).body
    : leafProblemOf(reading) === 'blurry' ? strings.blurredBody : strings.leafNotClear;
  return (
    <View className="flex-row items-center gap-4 rounded-control bg-surface p-3 shadow-sm">
      <Image
        source={{ uri: photo.uri }}
        className="h-16 w-16 rounded-control bg-hairline"
        accessibilityIgnoresInvertColors
        accessible={false}
      />
      <View className="flex-1 gap-2">
        <Muted className="text-ink">{reason}</Muted>
        <Button
          label={fillTemplate(strings.retakeLeafNumber, { number })}
          icon={ArrowCounterClockwise}
          variant="quiet"
          onPress={onRetake}
          disabled={disabled}
        />
      </View>
    </View>
  );
}

type ProblemLeavesProps = {
  strings: Strings;
  photos: LeafPhoto[];
  readings: LeafReading[];
  onRetake: (index: number) => void;
  disabled: boolean;
};

function ProblemLeaves({ strings, photos, readings, onRetake, disabled }: ProblemLeavesProps) {
  const problemIndexes = readings
    .map((reading, index) => (leafProblemOf(reading) ? index : -1))
    .filter((index) => index >= 0);
  if (problemIndexes.length === 0) return null;
  return (
    <View className="gap-3">
      {problemIndexes.map((index) => (
        <ProblemLeafRow
          key={index}
          strings={strings}
          number={index + 1}
          photo={photos[index]}
          reading={readings[index]}
          onRetake={() => onRetake(index)}
          disabled={disabled}
        />
      ))}
    </View>
  );
}

function CheckingNotice({ strings }: { strings: Strings }) {
  return (
    <View
      accessibilityLiveRegion="polite"
      className="flex-row items-center gap-3 rounded-control bg-surface p-4 shadow-sm"
    >
      <LeafLoader size={36} label={strings.checking} />
      <Body>{strings.checking}</Body>
    </View>
  );
}

type ActionsProps = Pick<
  CaptureScreenProps,
  'strings' | 'photos' | 'check' | 'isChecking' | 'isFinishing' | 'canCheck' | 'onTakeLeaf' | 'onFinish'
>;

function CaptureActions({ strings, photos, check, isChecking, isFinishing = false, canCheck, onTakeLeaf, onFinish }: ActionsProps) {
  const canAddLeaf = canCheck && !isChecking && !isFinishing && photos.length < MAX_LEAVES_PER_PLANT;
  const canFinish = !isChecking && !isFinishing && check !== null && check.verdict.kind !== 'retake';
  const cameraLabel = photos.length === 0 ? strings.takePhoto : strings.addAnotherLeaf;
  return (
    <View className="gap-3 bg-paper pb-6 pt-3">
      {canFinish && (
        <Button
          label={isFinishing ? strings.checking : strings.seeAdvice}
          icon={ArrowRight}
          onPress={onFinish}
          disabled={isFinishing}
        />
      )}
      {photos.length < MAX_LEAVES_PER_PLANT && (
        <View className="flex-row items-center gap-3">
          <View className="flex-1">
            <Button
              label={cameraLabel}
              icon={Camera}
              variant={canFinish ? 'secondary' : 'primary'}
              onPress={() => onTakeLeaf('camera')}
              disabled={!canAddLeaf}
            />
          </View>
          <IconButton
            label={strings.choosePhoto}
            icon={ImageSquare}
            onPress={() => onTakeLeaf('library')}
            disabled={!canAddLeaf}
          />
        </View>
      )}
    </View>
  );
}

type StatusProps = Pick<CaptureScreenProps, 'strings' | 'photos' | 'check' | 'isChecking' | 'isFinishing' | 'onTakeLeaf'>;

function CaptureStatus({ strings, photos, check, isChecking, isFinishing, onTakeLeaf }: StatusProps) {
  if (isChecking || isFinishing) return <CheckingNotice strings={strings} />;
  if (!check) return null;
  const hasProblemLeaves = check.verdict.kind !== 'answer';
  return (
    <>
      <VerdictPanel strings={strings} verdict={check.verdict} />
      {hasProblemLeaves && (
        <ProblemLeaves
          strings={strings}
          photos={photos}
          readings={check.readings}
          onRetake={(index) => onTakeLeaf('camera', index)}
          disabled={isFinishing ?? false}
        />
      )}
    </>
  );
}

function CaptureToolbar({ strings, onGoHome, onSwitchLanguage }: Pick<CaptureScreenProps, 'strings' | 'onGoHome' | 'onSwitchLanguage'>) {
  return (
    <View className="flex-row items-center justify-between">
      <IconButton label={strings.goHome} icon={LeafIcon} onPress={onGoHome} />
      <View accessible accessibilityLabel={strings.worksOffline}>
        <WifiSlash size={24} color={colors['ink-muted']} />
      </View>
      <IconButton label={strings.switchLanguage} icon={Translate} onPress={onSwitchLanguage} />
    </View>
  );
}

function PhotoGuide({ strings, modelId, modelLoading, isChecking, isFinishing, onSelectModel }: Pick<CaptureScreenProps, 'strings' | 'modelId' | 'modelLoading' | 'isChecking' | 'isFinishing' | 'onSelectModel'>) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <View className="gap-3">
      <View className="flex-row items-center justify-between gap-3">
        <Title className="flex-1">{strings.captureTitle}</Title>
        <IconButton label={strings.photoGuide} icon={Info} expanded={isOpen} onPress={() => setIsOpen(!isOpen)} />
      </View>
      {isOpen && (
        <View className="gap-4">
          <Body>{strings.captureTip}</Body>
          <ModelSelector modelId={modelId} strings={strings} disabled={isChecking || (isFinishing ?? false)} loading={modelLoading} onSelect={onSelectModel} />
        </View>
      )}
    </View>
  );
}

export function CaptureScreen(props: CaptureScreenProps) {
  const { strings, photos, check, problem } = props;
  return (
    <View className="flex-1">
      <ScrollView contentContainerClassName="flex-grow gap-6 px-5 pb-4 pt-2">
        <CaptureToolbar {...props} />
        <PhotoGuide {...props} />
        {photos.length === 0 ? (
          <View className="flex-1 justify-center gap-5">
            <View className="items-center">
              <LeafEmblem size={240} />
            </View>
          </View>
        ) : (
          <LeafSlots
            photoUris={photos.map((photo) => photo.uri)}
            readings={check?.readings ?? []}
            verdict={check?.verdict ?? null}
            slotCount={MAX_LEAVES_PER_PLANT}
            strings={strings}
            accessibilityLabel={fillTemplate(strings.leavesTaken, { count: photos.length, max: MAX_LEAVES_PER_PLANT })}
          />
        )}
        <CaptureStatus {...props} />
        {props.modelLoading && <CheckingNotice strings={{ ...strings, checking: strings.modelLoading }} />}
        {problem && <ProblemNotice strings={strings} problem={problem} />}
        {problem === 'modelFailed' && (
          <Button
            label={strings.retryModel}
            icon={ArrowCounterClockwise}
            variant="secondary"
            onPress={props.onRetryModel}
            disabled={props.isFinishing}
          />
        )}
        <CaptureActions {...props} />
      </ScrollView>
    </View>
  );
}
