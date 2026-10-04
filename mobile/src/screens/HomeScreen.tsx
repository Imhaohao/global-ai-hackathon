import {
  ArrowSquareOut,
  ArrowRight,
  Barcode,
  Bug,
  CaretDown,
  CaretUp,
  CloudRain,
  Coins,
  Gear,
  MapTrifold,
  Scales,
  Virus,
  Translate,
  type Icon,
} from 'phosphor-react-native';
import { useState } from 'react';
import { Image, Linking, Pressable, ScrollView, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { IconButton } from '../components/IconButton';
import { LeafEmblem, useLeafClock, WindBlownLeaf } from '../components/leaf/Leaf';
import { Body, Muted, SectionHeading } from '../components/Typography';
import { CONTROL_FOCUS_STYLE, useControlFocus } from '../components/useControlFocus';
import { fillTemplate, type Language, type Strings } from '../i18n/strings';
import { colors } from '../theme';
import {
  formatUpdateDate,
  LOCAL_UPDATES,
  updatePhoto,
  UPDATES_SAVED_ON,
  type LocalUpdate,
  type UpdateKind,
} from '../updates/localUpdates';

type HomeScreenProps = {
  strings: Strings;
  language: Language;
  onCheckTree: () => void;
  onOpenMap: () => void;
  onOpenSeedCheck?: () => void;
  onOpenSettings: () => void;
  onSwitchLanguage: () => void;
};

const STAGGER_MS = 100;
const UPDATE_PHOTO_SIZE = { width: 96, height: 96 };

const KIND_DISPLAY: Record<UpdateKind, { icon: Icon; label: (strings: Strings) => string }> = {
  weather: { icon: CloudRain, label: (strings) => strings.updateKindWeather },
  pest: { icon: Bug, label: (strings) => strings.updateKindPest },
  disease: { icon: Virus, label: (strings) => strings.updateKindDisease },
  market: { icon: Coins, label: (strings) => strings.updateKindMarket },
  policy: { icon: Scales, label: (strings) => strings.updateKindPolicy },
};

function enterAt(step: number) {
  return FadeInDown.delay(step * STAGGER_MS).duration(400);
}

function BrandMark() {
  const clock = useLeafClock(0.6);
  return (
    <View accessible={false} style={{ transform: [{ rotate: '-35deg' }] }}>
      <WindBlownLeaf size={44} clock={clock} strength={0.5} />
    </View>
  );
}

function HomeHeader({ strings, onOpenSettings, onSwitchLanguage }: Pick<HomeScreenProps, 'strings' | 'onOpenSettings' | 'onSwitchLanguage'>) {
  return (
    <View className="flex-row items-center gap-2">
      <BrandMark />
      <Text accessibilityRole="header" className="flex-1 text-2xl font-bold text-ink">
        {strings.authTitle}
      </Text>
      <IconButton label={strings.switchLanguage} icon={Translate} onPress={onSwitchLanguage} />
      <IconButton label={strings.settingsTitle} icon={Gear} onPress={onOpenSettings} />
    </View>
  );
}

function CheckTreeCard({ strings, onPress }: { strings: Strings; onPress: () => void }) {
  const focus = useControlFocus();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={strings.homeCheckTree}
      accessibilityHint={strings.homeCheckTreeHint}
      onPress={onPress}
      onFocus={focus.onFocus}
      onBlur={focus.onBlur}
      style={focus.isFocused ? CONTROL_FOCUS_STYLE : undefined}
      className="min-h-52 overflow-hidden rounded-card bg-accent p-6 active:bg-accent-pressed"
    >
      <View accessible={false} className="absolute -right-12 -top-16">
        <LeafEmblem size={224} />
      </View>
      <View className="mt-auto max-w-[70%] gap-2 pt-20">
        <Text className="text-3xl font-bold text-on-accent">{strings.homeCheckTree}</Text>
        <Text className="text-base leading-normal text-on-accent/80">{strings.homeCheckTreeHint}</Text>
      </View>
      <View accessible={false} className="absolute bottom-6 right-6 h-12 w-12 items-center justify-center rounded-full bg-on-accent">
        <ArrowRight size={24} weight="bold" color={colors.accent} />
      </View>
    </Pressable>
  );
}

function MenuTile({ label, hint, icon: TileIcon, onPress }: { label: string; hint: string; icon: Icon; onPress: () => void }) {
  const focus = useControlFocus();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      onPress={onPress}
      onFocus={focus.onFocus}
      onBlur={focus.onBlur}
      style={focus.isFocused ? CONTROL_FOCUS_STYLE : undefined}
      className="min-h-32 flex-1 justify-between gap-4 rounded-card bg-surface p-5 shadow-sm active:bg-hairline"
    >
      <TileIcon size={32} weight="duotone" color={colors.accent} />
      <View className="gap-1">
        <Text className="text-lg font-semibold text-ink">{label}</Text>
        <Text className="text-sm leading-snug text-ink-muted">{hint}</Text>
      </View>
    </Pressable>
  );
}

function UpdateDetails({ strings, update }: { strings: Strings; update: LocalUpdate }) {
  return (
    <View className="gap-3 pt-1">
      <Body>{update.summary}</Body>
      <Text className="text-sm text-ink-muted">{fillTemplate(strings.updatePhotoCredit, { credit: update.photo.credit })}</Text>
      <Pressable
        accessibilityRole="link"
        onPress={() => Linking.openURL(update.sourceUrl)}
        className="min-h-12 flex-row items-center gap-2 self-start rounded-control px-1"
      >
        <Text className="text-base font-semibold text-accent underline">{strings.updateReadSource}</Text>
        <ArrowSquareOut size={18} weight="bold" color={colors.accent} />
      </Pressable>
    </View>
  );
}

function UpdateCard({ strings, language, update }: { strings: Strings; language: Language; update: LocalUpdate }) {
  const [isOpen, setIsOpen] = useState(false);
  const focus = useControlFocus();
  const kind = KIND_DISPLAY[update.kind];
  const KindIcon = kind.icon;
  const Caret = isOpen ? CaretUp : CaretDown;
  return (
    <View className="gap-2 rounded-card bg-surface p-4 shadow-sm">
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: isOpen }}
        onPress={() => setIsOpen(!isOpen)}
        onFocus={focus.onFocus}
        onBlur={focus.onBlur}
        style={focus.isFocused ? CONTROL_FOCUS_STYLE : undefined}
        className="flex-row gap-4"
      >
        <View className="flex-1 gap-1.5">
          <View className="flex-row items-center gap-1.5">
            <KindIcon size={18} weight="bold" color={colors.accent} />
            <Text className="flex-1 text-sm font-semibold text-accent">{kind.label(strings)}</Text>
            <Text className="text-sm text-ink-muted">{formatUpdateDate(update.publishedOn, language)}</Text>
          </View>
          <Text className="text-lg font-semibold leading-snug text-ink">{update.headline}</Text>
          <View className="flex-row items-center gap-1">
            <Text numberOfLines={isOpen ? undefined : 1} className="flex-1 text-sm text-ink-muted">{update.source}</Text>
            <Caret size={16} weight="bold" color={colors['ink-muted']} />
          </View>
        </View>
        <Image
          source={updatePhoto(update)}
          accessibilityIgnoresInvertColors
          accessible={false}
          resizeMode="cover"
          style={UPDATE_PHOTO_SIZE}
          className="rounded-2xl bg-hairline"
        />
      </Pressable>
      {isOpen && <UpdateDetails strings={strings} update={update} />}
    </View>
  );
}

function UpdatesFeed({ strings, language }: Pick<HomeScreenProps, 'strings' | 'language'>) {
  return (
    <View className="gap-3">
      <View className="gap-1">
        <SectionHeading>{strings.updatesTitle}</SectionHeading>
        <Muted>{fillTemplate(strings.updatesSavedOn, { date: formatUpdateDate(UPDATES_SAVED_ON, language) })}</Muted>
      </View>
      {LOCAL_UPDATES.map((update, index) => (
        <Animated.View key={update.id} entering={enterAt(4 + index)}>
          <UpdateCard strings={strings} language={language} update={update} />
        </Animated.View>
      ))}
    </View>
  );
}

export function HomeScreen(props: HomeScreenProps) {
  const { strings, onCheckTree, onOpenMap, onOpenSeedCheck } = props;
  return (
    <ScrollView contentContainerClassName="gap-6 px-5 pb-8 pt-2">
      <Animated.View entering={enterAt(0)}>
        <HomeHeader {...props} />
      </Animated.View>
      <Animated.View entering={enterAt(1)}>
        <CheckTreeCard strings={strings} onPress={onCheckTree} />
      </Animated.View>
      <Animated.View entering={enterAt(2)}>
        <View className="flex-row gap-3">
          <MenuTile label={strings.mapTitle} hint={strings.homeMapHint} icon={MapTrifold} onPress={onOpenMap} />
          {onOpenSeedCheck && (
            <MenuTile label={strings.seedCheckTitle} hint={strings.homeSeedsHint} icon={Barcode} onPress={onOpenSeedCheck} />
          )}
        </View>
      </Animated.View>
      <Animated.View entering={enterAt(3)}>
        <UpdatesFeed {...props} />
      </Animated.View>
    </ScrollView>
  );
}
