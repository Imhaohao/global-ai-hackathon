import { BatteryFull, CellSignalFull, WifiHigh } from 'phosphor-react-native';
import type { ReactNode } from 'react';
import { Linking, Text, useWindowDimensions, View } from 'react-native';

import { colors } from '../src/theme';

import { PhotoSheet } from './PhotoSheet';

const SCREEN_WIDTH = 390;
const SCREEN_HEIGHT = 844;
const BEZEL = 12;
const PAGE_MARGIN = 32;
const SIDE_BY_SIDE_MIN_WIDTH = 900;
const SOURCE_URL = 'https://github.com/Imhaohao/global-ai-hackathon';

const TRY_IT_STEPS = [
  'Pick a language, then type any phone number. The demo signs you in without sending a code.',
  'Read the six consent cards and agree.',
  'Tap Take photo and add three sample leaves of one kind, or use photos of your own.',
  'Tap See advice to get the action card.',
];

function screenSize(windowHeight: number) {
  const height = Math.min(SCREEN_HEIGHT, windowHeight - 2 * (PAGE_MARGIN + BEZEL));
  return { width: Math.round((height * SCREEN_WIDTH) / SCREEN_HEIGHT), height };
}

function PhoneFrame({ height, children }: { height: number; children: ReactNode }) {
  const screen = screenSize(height);
  return (
    <View className="rounded-device bg-black p-3 shadow-2xl">
      <View style={screen} className="overflow-hidden rounded-screen bg-paper">
        <DeviceStatusBar />
        {children}
        <View accessible={false} className="h-6 items-center justify-center">
          <View className="h-1.5 w-32 rounded-full bg-ink" />
        </View>
      </View>
    </View>
  );
}

function DeviceStatusBar() {
  return (
    <View accessible={false} className="h-11 flex-row items-center justify-between px-8">
      <Text className="text-base font-semibold text-ink">9:41</Text>
      <View className="flex-row items-center gap-1.5">
        <CellSignalFull size={18} weight="fill" color={colors.ink} />
        <WifiHigh size={18} weight="bold" color={colors.ink} />
        <BatteryFull size={22} weight="fill" color={colors.ink} />
      </View>
    </View>
  );
}

function AboutPanel() {
  return (
    <View className="max-w-md gap-6">
      <Text accessibilityRole="header" className="text-5xl font-bold text-paper">Leaf Doctor</Text>
      <Text className="text-lg leading-relaxed text-paper">
        This is the Leaf Doctor phone app running in your browser. The coffee-leaf model runs on your computer
        from the same 8 MB file the phone ships with, so your photos never leave this page.
      </Text>
      <View role="list" className="gap-3">
        {TRY_IT_STEPS.map((step, index) => (
          <View key={step} role="listitem" className="flex-row gap-3">
            <Text className="w-6 text-lg font-semibold text-paper">{index + 1}.</Text>
            <Text className="flex-1 text-lg leading-relaxed text-paper">{step}</Text>
          </View>
        ))}
      </View>
      <Text className="text-base leading-normal text-paper/70">
        Nothing is saved between visits. On a phone, Send to field officer opens your messaging app.
      </Text>
      <Text
        accessibilityRole="link"
        onPress={() => Linking.openURL(SOURCE_URL)}
        className="text-base font-semibold text-paper underline"
      >
        Read the source on GitHub
      </Text>
    </View>
  );
}

export function DemoShell({ children }: { children: ReactNode }) {
  const window = useWindowDimensions();
  const app = (
    <View className="flex-1">
      {children}
      <PhotoSheet />
    </View>
  );

  if (window.width < SIDE_BY_SIDE_MIN_WIDTH) return app;

  return (
    <View className="flex-1 flex-row items-center justify-center gap-20 bg-ink px-8">
      <AboutPanel />
      <PhoneFrame height={window.height}>{app}</PhoneFrame>
    </View>
  );
}
