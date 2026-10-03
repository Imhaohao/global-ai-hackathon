import { CheckCircle, Warning, WarningOctagon, type Icon } from 'phosphor-react-native';
import { Text, View } from 'react-native';

import type { Severity } from '../diagnosis/conditions';
import { colors } from '../theme';

const ICON_BY_SEVERITY: Record<Severity, Icon> = {
  healthy: CheckCircle,
  watch: Warning,
  sick: WarningOctagon,
};

const STYLE_BY_SEVERITY: Record<Severity, { container: string; label: string; color: string }> = {
  healthy: { container: 'bg-healthy-soft', label: 'text-healthy', color: colors.healthy },
  watch: { container: 'bg-watch-soft', label: 'text-watch', color: colors.watch },
  sick: { container: 'bg-sick-soft', label: 'text-sick', color: colors.sick },
};

export function SeverityBadge({ severity, label }: { severity: Severity; label: string }) {
  const IconComponent = ICON_BY_SEVERITY[severity];
  const style = STYLE_BY_SEVERITY[severity];
  return (
    <View className={`flex-row items-center gap-2 self-start rounded-full px-4 py-2 ${style.container}`}>
      <IconComponent size={22} weight="fill" color={style.color} />
      <Text className={`text-base font-semibold ${style.label}`}>{label}</Text>
    </View>
  );
}
