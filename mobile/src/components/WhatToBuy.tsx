import { Drop, HandPalm, Plant, Scissors, Storefront, Warning, type Icon } from 'phosphor-react-native';
import { Text, View } from 'react-native';

import type { PurchaseItem, ShoppingAdvice } from '../../../shared/src/whatToBuy.ts';
import type { Strings } from '../i18n/strings';
import { colors } from '../theme';
import { Body, Muted, SectionHeading } from './Typography';

type BuyCopyKey = Extract<keyof Strings, `buy${string}`>;

type ItemCopyKeys = { name: BuyCopyKey; why: BuyCopyKey; icon: Icon };

const ITEM_COPY: Record<PurchaseItem, ItemCopyKeys> = {
  fertilizer: { name: 'buyFertilizer', why: 'buyFertilizerWhy', icon: Plant },
  pruningTools: { name: 'buyPruningTools', why: 'buyPruningToolsWhy', icon: Scissors },
  copperFungicide: { name: 'buyCopperFungicide', why: 'buyCopperFungicideWhy', icon: Drop },
  sprayGear: { name: 'buySprayGear', why: 'buySprayGearWhy', icon: HandPalm },
};

function DecorativeIcon({ icon: IconComponent, color }: { icon: Icon; color: string }) {
  return (
    <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <IconComponent size={28} weight="duotone" color={color} />
    </View>
  );
}

function PurchaseRow({ item, strings }: { item: PurchaseItem; strings: Strings }) {
  const copy = ITEM_COPY[item];
  return (
    <View className="flex-row gap-3">
      <DecorativeIcon icon={copy.icon} color={colors.accent} />
      <View className="flex-1 gap-1">
        <Text className="text-lg font-semibold text-ink">{strings[copy.name]}</Text>
        <Muted>{strings[copy.why]}</Muted>
      </View>
    </View>
  );
}

function WaitForOfficer({ strings }: { strings: Strings }) {
  return (
    <View className="flex-row gap-3 rounded-card bg-watch-soft p-5">
      <DecorativeIcon icon={Warning} color={colors.watch} />
      <Body className="flex-1 text-watch">{strings.buyWaitForOfficer}</Body>
    </View>
  );
}

export function WhatToBuy({ advice, strings }: { advice: ShoppingAdvice; strings: Strings }) {
  if (advice.waitForOfficer) return <WaitForOfficer strings={strings} />;
  if (advice.items.length === 0) return null;
  return (
    <View className="gap-4 rounded-card bg-surface p-5 shadow-sm">
      <SectionHeading>{strings.buyTitle}</SectionHeading>
      {advice.items.map((item) => (
        <PurchaseRow key={item} item={item} strings={strings} />
      ))}
      <View className="flex-row items-center gap-3">
        <DecorativeIcon icon={Storefront} color={colors['ink-muted']} />
        <Muted className="flex-1">{strings.buyAtDealer}</Muted>
      </View>
    </View>
  );
}
