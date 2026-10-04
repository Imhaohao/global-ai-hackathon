import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { Gear, X } from 'phosphor-react-native';
import { useEffect, useRef } from 'react';
import { Linking, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import type { Strings } from '../i18n/strings';
import { SEED_BARCODE_TYPES } from '../screens/seedBarcode';
import { LeafLoader } from './leaf/Leaf';
import { Button } from './Button';
import { Body } from './Typography';

const BARCODE_SETTINGS = { barcodeTypes: [...SEED_BARCODE_TYPES] };
const SWEEP_MS = 1400;

const GUIDE_CORNERS = [
  'left-0 top-0 border-l-4 border-t-4',
  'right-0 top-0 border-r-4 border-t-4',
  'bottom-0 left-0 border-b-4 border-l-4',
  'bottom-0 right-0 border-b-4 border-r-4',
];

type SeedBarcodeScannerProps = { strings: Strings; onScanned: (data: string) => void; onCancel: () => void };

function SweepLine() {
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(0.5);
  useEffect(() => {
    if (reduceMotion) return;
    progress.value = 0;
    progress.value = withRepeat(withTiming(1, { duration: SWEEP_MS, easing: Easing.inOut(Easing.quad) }), -1, true);
  }, [progress, reduceMotion]);
  const style = useAnimatedStyle(() => ({ top: `${progress.value * 100}%` }));
  return <Animated.View style={style} className="absolute left-3 right-3 h-0.5 rounded-full bg-on-accent" />;
}

function GuideWindow() {
  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      className="absolute inset-0 items-center justify-center"
    >
      <View className="h-2/5 w-4/5">
        {GUIDE_CORNERS.map((corner) => (
          <View key={corner} className={`absolute h-10 w-10 border-on-accent ${corner}`} />
        ))}
        <SweepLine />
      </View>
    </View>
  );
}

function CameraBlocked({ strings, onCancel }: Pick<SeedBarcodeScannerProps, 'strings' | 'onCancel'>) {
  return (
    <View accessibilityLiveRegion="polite" className="gap-3 rounded-control bg-sick-soft p-4">
      <Body className="text-sick">{strings.cameraBlocked}</Body>
      <Button label={strings.openSettings} icon={Gear} variant="secondary" onPress={() => Linking.openSettings()} />
      <Button label={strings.seedScanCancel} icon={X} variant="quiet" onPress={onCancel} />
    </View>
  );
}

export function SeedBarcodeScanner({ strings, onScanned, onCancel }: SeedBarcodeScannerProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const hasScanned = useRef(false);

  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) requestPermission();
  }, [permission, requestPermission]);

  if (permission && !permission.granted && !permission.canAskAgain) {
    return <CameraBlocked strings={strings} onCancel={onCancel} />;
  }

  const reportFirstScan = ({ data }: BarcodeScanningResult) => {
    if (hasScanned.current) return;
    hasScanned.current = true;
    onScanned(data);
  };

  return (
    <View className="gap-4">
      <View className="aspect-[4/3] w-full overflow-hidden rounded-card bg-ink">
        {permission?.granted ? (
          <>
            <CameraView
              style={{ flex: 1 }}
              facing="back"
              barcodeScannerSettings={BARCODE_SETTINGS}
              onBarcodeScanned={reportFirstScan}
            />
            <GuideWindow />
          </>
        ) : (
          <View className="flex-1 items-center justify-center">
            <LeafLoader label={strings.loading} />
          </View>
        )}
      </View>
      <Body className="text-center">{strings.seedScanHint}</Body>
      <Button label={strings.seedScanCancel} icon={X} variant="secondary" onPress={onCancel} />
    </View>
  );
}
