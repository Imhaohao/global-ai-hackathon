import { Binoculars, PhoneCall, Scissors, SprayBottle, type Icon } from 'phosphor-react-native';
import { View } from 'react-native';

import type { FarmDecision } from '../../../shared/src/contract.ts';
import type { Urgency } from '../../../shared/src/types.ts';
import type { Severity } from '../diagnosis/conditions';
import { colors } from '../theme';
import { Title } from './Typography';

const ICON_BY_DECISION: Record<FarmDecision, Icon> = {
  spray: SprayBottle,
  pruneAndClean: Scissors,
  monitor: Binoculars,
  callOfficer: PhoneCall,
};

const SEVERITY_BY_URGENCY: Record<Urgency, Severity> = {
  none: 'healthy',
  low: 'watch',
  medium: 'watch',
  high: 'sick',
};

const STYLE_BY_SEVERITY: Record<Severity, { container: string; color: string }> = {
  healthy: { container: 'bg-healthy-soft', color: colors.healthy },
  watch: { container: 'bg-watch-soft', color: colors.watch },
  sick: { container: 'bg-sick-soft', color: colors.sick },
};

type DecisionHeaderProps = { decision: FarmDecision; urgency: Urgency; headline: string };

export function DecisionHeader({ decision, urgency, headline }: DecisionHeaderProps) {
  const IconComponent = ICON_BY_DECISION[decision];
  const style = STYLE_BY_SEVERITY[SEVERITY_BY_URGENCY[urgency]];
  return (
    <View className={`gap-4 rounded-card p-5 ${style.container}`}>
      <IconComponent size={64} weight="duotone" color={style.color} />
      <Title>{headline}</Title>
    </View>
  );
}
