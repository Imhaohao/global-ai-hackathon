import Svg, { Line, Rect } from 'react-native-svg';

import { colors } from '../theme';

const CODE_DIGITS = [0, 1, 2, 3];
const SCRATCH_MARKS = [0, 1, 2, 3];

export function SeedPacketSticker() {
  return (
    <Svg
      width="100%"
      height={150}
      viewBox="0 0 240 150"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Rect x={30} y={8} width={180} height={134} rx={14} fill={colors.accent} />
      <Rect x={30} y={8} width={180} height={16} rx={8} fill={colors['accent-pressed']} />
      <Rect x={48} y={40} width={144} height={86} rx={10} fill={colors.surface} />
      <Rect x={60} y={52} width={44} height={8} rx={4} fill={colors.hairline} />
      <Rect x={60} y={68} width={34} height={8} rx={4} fill={colors.hairline} />
      <Rect x={60} y={84} width={40} height={8} rx={4} fill={colors.hairline} />
      <Rect x={112} y={58} width={68} height={52} rx={8} fill={colors['ink-muted']} />
      {SCRATCH_MARKS.map((mark) => (
        <Line
          key={mark}
          x1={126 + mark * 13}
          y1={100}
          x2={136 + mark * 13}
          y2={68}
          stroke={colors.hairline}
          strokeWidth={9}
          strokeLinecap="round"
        />
      ))}
      {CODE_DIGITS.map((digit) => (
        <Rect key={digit} x={124 + digit * 14} y={80} width={8} height={14} rx={2} fill={colors.ink} />
      ))}
    </Svg>
  );
}
