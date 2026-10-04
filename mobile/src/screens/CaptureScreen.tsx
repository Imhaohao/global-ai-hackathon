import {
  ArrowCounterClockwise,
  ArrowRight,
  Camera,
  CheckCircle,
  Gear,
  ImageSquare,
  MapTrifold,
  Plant,
  Translate,
  Warning,
  Info,
  WifiSlash,
} from 'phosphor-react-native';
import { useState } from 'react';
import { ActivityIndicator, Image, Linking, Pressable, ScrollView, Text, View } from 'react-native';

import type { LeafReading, PlantCheck, PlantVerdict } from '../../../shared/src/contract.ts';
import { MAX_LEAVES_PER_PLANT } from '../../../shared/src/plantVote.ts';
import { BotanicalImage } from '../components/BotanicalImage';
import { IconButton } from '../components/IconButton';
import { Button } from '../components/Button';
import { ModelSelector } from '../components/ModelSelector';
import { LeafSlots } from '../components/LeafSlots';
import { PillButton } from '../components/PillButton';
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
  onOpenSettings: () => void;
  onOpenSeedCheck?: () => void;
  onOpenMap: () => void;
  onSwitchLanguage: () => void;
};

function ProblemNotice({ strings, problem }: { strings: Strings; problem: CaptureProblem }) {
  return (
    <View accessibilityLiveRegion="polite" className="gap-3 rounded-control bg-sick-soft p-4">
      <Body className="text-sick">{strings[problem]}</Body>
      {problem === 'cameraBlocked' && (
        <Pressable accessibilityRole="link" onPress={() => Linking.openSettings()} className="min-h-11 justify-center">
          <Text className="text-lg font-semibold text-sick underline">{strings.openSettings}</Text>
        </Pressable>
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
};

function ProblemLeafRow({ strings, number, photo, reading, onRetake }: ProblemLeafRowProps) {
  const reason = reading.qualityIssue
    ? getQualityGuidance(strings, reading.qualityIssue).body
    : leafProblemOf(reading) === 'tooDark' ? strings.leafTooDark : strings.leafNotClear;
  return (
    <View className="flex-row items-center gap-4 rounded-control bg-surface p-3 shadow-sm">
      <Image
        source={{ uri: photo.uri }}
        className="h-16 w-16 rounded-control bg-hairline"
        accessibilityIgnoresInvertColors
      />
      <View className="flex-1 gap-2">
        <Muted className="text-ink">{reason}</Muted>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={fillTemplate(strings.retakeLeafNumber, { number })}
          onPress={onRetake}
          className="min-h-11 flex-row items-center gap-2 self-start"
        >
          <ArrowCounterClockwise size={20} weight="bold" color={colors.accent} />
          <Text className="text-base font-semibold text-accent">
            {fillTemplate(strings.retakeLeafNumber, { number })}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

type ProblemLeavesProps = {
  strings: Strings;
  photos: LeafPhoto[];
  readings: LeafReading[];
  onRetake: (index: number) => void;
};

function ProblemLeaves({ strings, photos, readings, onRetake }: ProblemLeavesProps) {
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
      <ActivityIndicator color={colors.accent} />
      <Body>{strings.checking}</Body>
    </View>
  );
}

type ActionsProps = Pick<
  CaptureScreenProps,
  'strings' | 'photos' | 'check' | 'isChecking' | 'isFinishing' | 'canCheck' | 'onTakeLeaf' | 'onFinish'
>;

function CaptureActions({ strings, photos, check, isChecking, isFinishing = false, canCheck, onTakeLeaf, onFinish }: ActionsProps) {
  const canAddLeaf = canCheck && !isChecking && photos.length < MAX_LEAVES_PER_PLANT;
  const canFinish = !isChecking && check !== null && check.verdict.kind !== 'retake';
  const cameraLabel = photos.length === 0 ? strings.takePhoto : strings.addAnotherLeaf;
  return (
    <View className="gap-3 bg-paper px-5 pb-6 pt-3">
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
        />
      )}
    </>
  );
}

function CaptureToolbar({ strings, onOpenSettings, onSwitchLanguage }: Pick<CaptureScreenProps, 'strings' | 'onOpenSettings' | 'onSwitchLanguage'>) {
  return (
    <View className="flex-row items-center justify-between">
      <IconButton label={strings.settingsTitle} icon={Gear} onPress={onOpenSettings} />
      <View accessible accessibilityLabel={strings.worksOffline}>
        <WifiSlash size={24} color={colors['ink-muted']} />
      </View>
      <IconButton label={strings.switchLanguage} icon={Translate} onPress={onSwitchLanguage} />
    </View>
  );
}

function PhotoGuide({ strings, modelId, modelLoading, isChecking, onSelectModel }: Pick<CaptureScreenProps, 'strings' | 'modelId' | 'modelLoading' | 'isChecking' | 'onSelectModel'>) {
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
          <ModelSelector modelId={modelId} strings={strings} disabled={isChecking} loading={modelLoading} onSelect={onSelectModel} />
        </View>
      )}
    </View>
  );
}

export function CaptureScreen(props: CaptureScreenProps) {
  const { strings, photos, check, problem, onOpenSeedCheck, onOpenMap } = props;
  return (
    <View className="flex-1">
      <ScrollView contentContainerClassName="flex-grow gap-6 px-5 pb-4 pt-2">
        <CaptureToolbar {...props} />
        <PhotoGuide {...props} />
        {photos.length === 0 ? (
          <View className="flex-1 justify-center gap-5">
            <BotanicalImage />
            <View className="flex-row flex-wrap items-center justify-center gap-3">
              <PillButton label={strings.mapTitle} icon={MapTrifold} onPress={onOpenMap} />
              {onOpenSeedCheck && <PillButton label={strings.seedCheckTitle} icon={Plant} onPress={onOpenSeedCheck} />}
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
          <Button label={strings.retryModel} icon={ArrowCounterClockwise} variant="secondary" onPress={props.onRetryModel} />
        )}
      </ScrollView>
      <CaptureActions {...props} />
    </View>
  );
}
