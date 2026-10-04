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

function copyFor(result: SeedScanResult, strings: Strings, phone: string) {
  if (result.kind === 'genuine') return { title: strings.seedGenuineTitle, body: strings.seedGenuineBody };
  if (result.kind === 'recalled') return { title: strings.seedRecalledTitle, body: strings.seedRecalledBody };
  return { title: strings.seedUnknownTitle, body: fillTemplate(strings.seedUnknownBody, { phone }) };
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
  const copy = copyFor(result, strings, phone);
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
      <Body>{copy.body}</Body>
      {result.kind !== 'unknown' && <PacketDetails packet={result.packet} strings={strings} />}
    </View>
  );
}
