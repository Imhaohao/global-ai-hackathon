import {
  ArrowCounterClockwise,
  ArrowRight,
  Camera,
  CheckCircle,
  Gear,
  ImageSquare,
  Plant,
  Translate,
  Warning,
  WifiSlash,
} from 'phosphor-react-native';
import { ActivityIndicator, Image, Linking, Pressable, ScrollView, Text, View } from 'react-native';

import type { LeafReading, PlantCheck, PlantVerdict } from '../../../shared/src/contract.ts';
import { Button } from '../components/Button';
import { ModelSelector } from '../components/ModelSelector';
import { LeafSlots } from '../components/LeafSlots';
import { PillButton } from '../components/PillButton';
import { Body, Muted, Title } from '../components/Typography';
import { Viewfinder } from '../components/Viewfinder';
import type { LeafPhoto } from '../diagnosis/classifyLeaf';
import { MAX_LEAVES_PER_PLANT } from '../diagnosis/diagnosePlant';
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
  onOpenSettings: () => void;
  onOpenSeedCheck?: () => void;
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
    return fillTemplate(strings.leavesAgreeTitle, { agreeing: verdict.agreeing, usable: verdict.usable });
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
      {verdict.kind === 'retake' && <Body className={tone.text}>{strings.retakeBody}</Body>}
    </View>
  );
}

type ProblemLeafRowProps = {
  strings: Strings;
  photo: LeafPhoto;
  reading: LeafReading;
  onRetake: () => void;
};

function ProblemLeafRow({ strings, photo, reading, onRetake }: ProblemLeafRowProps) {
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
          onPress={onRetake}
          className="min-h-11 flex-row items-center gap-2 self-start"
        >
          <ArrowCounterClockwise size={20} weight="bold" color={colors.accent} />
          <Text className="text-base font-semibold text-accent">{strings.retakeLeaf}</Text>
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
  'strings' | 'photos' | 'check' | 'isChecking' | 'canCheck' | 'onTakeLeaf' | 'onFinish'
>;

function CaptureActions({ strings, photos, check, isChecking, canCheck, onTakeLeaf, onFinish }: ActionsProps) {
  const canAddLeaf = canCheck && !isChecking && photos.length < MAX_LEAVES_PER_PLANT;
  const canFinish = !isChecking && check !== null && check.verdict.kind !== 'retake';
  const cameraLabel = photos.length === 0 ? strings.takePhoto : strings.addAnotherLeaf;
  const cameraVariant = canFinish ? 'secondary' : 'primary';
  return (
    <View className="gap-2 bg-paper px-5 pb-6 pt-3">
      {canFinish && <Button label={strings.seeAdvice} icon={ArrowRight} onPress={onFinish} />}
      {photos.length < MAX_LEAVES_PER_PLANT && (
        <>
          <Button
            label={cameraLabel}
            icon={Camera}
            variant={cameraVariant}
            onPress={() => onTakeLeaf('camera')}
            disabled={!canAddLeaf}
          />
          <Button
            label={strings.choosePhoto}
            icon={ImageSquare}
            variant="quiet"
            onPress={() => onTakeLeaf('library')}
            disabled={!canAddLeaf}
          />
        </>
      )}
      {photos.length === 0 && (
        <View className="flex-row items-center justify-center gap-2">
          <WifiSlash size={18} color={colors['ink-muted']} />
          <Muted>{strings.worksOffline}</Muted>
        </View>
      )}
    </View>
  );
}

type StatusProps = Pick<CaptureScreenProps, 'strings' | 'photos' | 'check' | 'isChecking' | 'onTakeLeaf'>;

function CaptureStatus({ strings, photos, check, isChecking, onTakeLeaf }: StatusProps) {
  if (isChecking) return <CheckingNotice strings={strings} />;
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

function FirstLeafGuide({ strings, onOpenSeedCheck }: Pick<CaptureScreenProps, 'strings' | 'onOpenSeedCheck'>) {
  return (
    <>
      <Viewfinder compact />
      <Muted>{strings.captureTip}</Muted>
      {onOpenSeedCheck && (
        <View className="items-start">
          <PillButton label={strings.seedCheckTitle} icon={Plant} onPress={onOpenSeedCheck} />
        </View>
      )}
    </>
  );
}

export function CaptureScreen(props: CaptureScreenProps) {
  const { strings, photos, check, problem, onOpenSettings, onOpenSeedCheck, onSwitchLanguage } = props;
  return (
    <View className="flex-1">
      <ScrollView contentContainerClassName="gap-5 px-5 pb-4 pt-2">
        <View className="flex-row items-center justify-between">
          <PillButton label={strings.settingsTitle} icon={Gear} onPress={onOpenSettings} />
          <PillButton label={strings.switchLanguage} icon={Translate} onPress={onSwitchLanguage} />
        </View>
        <Title>{strings.captureTitle}</Title>
        <LeafSlots
          photoUris={photos.map((photo) => photo.uri)}
          readings={check?.readings ?? []}
          verdict={check?.verdict ?? null}
          slotCount={MAX_LEAVES_PER_PLANT}
          accessibilityLabel={fillTemplate(strings.leavesTaken, { count: photos.length, max: MAX_LEAVES_PER_PLANT })}
        />
        {photos.length === 0 && <FirstLeafGuide strings={strings} onOpenSeedCheck={onOpenSeedCheck} />}
        <ModelSelector
          modelId={props.modelId}
          strings={strings}
          disabled={props.isChecking}
          loading={props.modelLoading}
          onSelect={props.onSelectModel}
        />
        <CaptureStatus {...props} />
        {problem && <ProblemNotice strings={strings} problem={problem} />}
        {problem === 'modelFailed' && (
          <Button label={strings.retryModel} icon={ArrowCounterClockwise} variant="secondary" onPress={props.onRetryModel} />
        )}
      </ScrollView>
      <CaptureActions {...props} />
    </View>
  );
}
