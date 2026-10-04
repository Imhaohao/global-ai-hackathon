import { Prohibit, Question, SealCheck, type Icon } from 'phosphor-react-native';
import { Text, View } from 'react-native';

import { fillTemplate, type Strings } from '../i18n/strings';
import type { SeedPacket, SeedScanResult } from '../screens/seedBarcode';
import { colors } from '../theme';
import { Body } from './Typography';

type ResultKind = SeedScanResult['kind'];

const LOOK_BY_KIND: Record<ResultKind, { icon: Icon; container: string; title: string; color: string }> = {
  genuine: { icon: SealCheck, container: 'bg-healthy-soft', title: 'text-healthy', color: colors.healthy },
  recalled: { icon: Prohibit, container: 'bg-sick-soft', title: 'text-sick', color: colors.sick },
  unknown: { icon: Question, container: 'bg-watch-soft', title: 'text-watch', color: colors.watch },
};

function copyFor(kind: ResultKind, strings: Strings, phone: string) {
  if (kind === 'genuine') {
    return { title: strings.seedGenuineTitle, steps: [strings.seedGenuineStep1, strings.seedGenuineStep2] };
  }
  if (kind === 'recalled') {
    return {
      title: strings.seedRecalledTitle,
      steps: [strings.seedRecalledStep1, strings.seedRecalledStep2, strings.seedRecalledStep3, strings.seedRecalledStep4],
    };
  }
  return {
    title: strings.seedUnknownTitle,
    steps: [
      strings.seedUnknownStep1,
      strings.seedUnknownStep2,
      fillTemplate(strings.seedUnknownStep3, { phone }),
      strings.seedUnknownStep4,
    ],
  };
}

function NumberedSteps({ steps, numberColor }: { steps: string[]; numberColor: string }) {
  return (
    <View className="gap-3">
      {steps.map((step, index) => (
        <View key={step} className="flex-row gap-3">
          <Text className="w-6 text-lg font-bold" style={{ color: numberColor, fontVariant: ['tabular-nums'] }}>
            {index + 1}
          </Text>
          <Body className="flex-1">{step}</Body>
        </View>
      ))}
    </View>
  );
}

function PacketDetails({ packet, strings }: { packet: SeedPacket; strings: Strings }) {
  const rows: [string, string][] = [
    [strings.seedVariety, packet.variety],
    [strings.seedLot, packet.lot],
    [strings.seedPackedOn, packet.packedOn],
  ];
  return (
    <View className="gap-2 rounded-control bg-surface p-4">
      {rows.map(([label, value]) => (
        <View key={label} className="flex-row justify-between gap-4">
          <Text className="text-base text-ink-muted">{label}</Text>
          <Text selectable className="text-base font-semibold text-ink" style={{ fontVariant: ['tabular-nums'] }}>
            {value}
          </Text>
        </View>
      ))}
    </View>
  );
}

type SeedScanResultCardProps = { result: SeedScanResult; strings: Strings; phone: string };

export function SeedScanResultCard({ result, strings, phone }: SeedScanResultCardProps) {
  const look = LOOK_BY_KIND[result.kind];
  const copy = copyFor(result.kind, strings, phone);
  const IconComponent = look.icon;
  return (
    <View accessibilityLiveRegion="assertive" className={`gap-4 rounded-card p-5 ${look.container}`}>
      <View className="flex-row items-center gap-3">
        <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <IconComponent size={40} weight="fill" color={look.color} />
        </View>
        <Text accessibilityRole="header" className={`flex-1 text-2xl font-bold ${look.title}`}>
          {copy.title}
        </Text>
      </View>
      <NumberedSteps steps={copy.steps} numberColor={look.color} />
      {result.kind !== 'unknown' && <PacketDetails packet={result.packet} strings={strings} />}
    </View>
  );
}
