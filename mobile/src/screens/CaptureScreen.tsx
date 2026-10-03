import { Camera, ImageSquare, Translate, WifiSlash } from 'phosphor-react-native';
import { Linking, Pressable, Text, View } from 'react-native';

import { Button } from '../components/Button';
import { Body, Muted, Title } from '../components/Typography';
import { Viewfinder } from '../components/Viewfinder';
import type { PhotoSource } from '../diagnosis/pickLeafPhoto';
import type { Strings } from '../i18n/strings';
import { colors } from '../theme';

export type CaptureProblem = 'cameraBlocked' | 'photoFailed' | 'modelFailed';

type CaptureScreenProps = {
  strings: Strings;
  checkingPhotoUri?: string;
  problem?: CaptureProblem;
  canCheck: boolean;
  onPick: (source: PhotoSource) => void;
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

export function CaptureScreen({ strings, checkingPhotoUri, problem, canCheck, onPick, onSwitchLanguage }: CaptureScreenProps) {
  const isChecking = Boolean(checkingPhotoUri);
  return (
    <View className="flex-1 justify-between gap-6 px-5 pb-6 pt-2">
      <Pressable
        accessibilityRole="button"
        onPress={onSwitchLanguage}
        className="min-h-11 flex-row items-center gap-2 self-end rounded-full bg-surface px-4 py-2 shadow-sm"
      >
        <Translate size={20} color={colors.accent} />
        <Text className="text-base font-medium text-ink">{strings.switchLanguage}</Text>
      </Pressable>

      <View className="gap-4">
        <Title>{isChecking ? strings.checking : strings.homeTitle}</Title>
        <Viewfinder photoUri={checkingPhotoUri} isChecking={isChecking} />
        <Muted>{strings.photoTip}</Muted>
      </View>

      <View className="gap-3">
        {problem && <ProblemNotice strings={strings} problem={problem} />}
        <Button label={strings.takePhoto} icon={Camera} onPress={() => onPick('camera')} disabled={!canCheck || isChecking} />
        <Button
          label={strings.choosePhoto}
          icon={ImageSquare}
          variant="secondary"
          onPress={() => onPick('library')}
          disabled={!canCheck || isChecking}
        />
        <View className="flex-row items-center justify-center gap-2 pt-1">
          <WifiSlash size={18} color={colors['ink-muted']} />
          <Muted>{strings.worksOffline}</Muted>
        </View>
      </View>
    </View>
  );
}
