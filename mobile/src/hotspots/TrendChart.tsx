import { View } from 'react-native';
import Svg, { Rect, Text as SvgText } from 'react-native-svg';

import type { AppLanguage } from '../../../shared/src/contract.ts';
import type { TrendWeek } from '../../../shared/src/hotspots.ts';
import type { DiseaseKey } from '../../../shared/src/index.ts';
import { fillTemplate, type Strings } from '../i18n/strings';
import { colors } from '../theme';
import { Muted } from '../components/Typography';
import { DISEASE_COLORS } from './diseaseColors';
import { formatWeekStart } from './formatSighting';

const CHART_HEIGHT = 140;
const LABEL_SPACE = 22;
const TOP_SPACE = 18;
const BAR_SHARE = 0.7;

type TrendChartProps = {
  weeks: TrendWeek[];
  conditions: DiseaseKey[];
  language: AppLanguage;
  strings: Strings;
  width: number;
};

function shownTotal(week: TrendWeek, conditions: DiseaseKey[]): number {
  return conditions.reduce((sum, condition) => sum + week.counts[condition], 0);
}

function WeekBar({
  week,
  conditions,
  index,
  slot,
  unit,
}: {
  week: TrendWeek;
  conditions: DiseaseKey[];
  index: number;
  slot: number;
  unit: number;
}) {
  const baseline = CHART_HEIGHT - LABEL_SPACE;
  const heights = conditions.map((condition) => week.counts[condition] * unit);
  return (
    <>
      {conditions.map((condition, position) => {
        const height = heights[position];
        const stackedHeight = heights.slice(0, position + 1).reduce((sum, value) => sum + value, 0);
        if (height === 0) return null;
        return (
          <Rect
            key={condition}
            x={index * slot + (slot * (1 - BAR_SHARE)) / 2}
            y={baseline - stackedHeight}
            width={slot * BAR_SHARE}
            height={height}
            fill={DISEASE_COLORS[condition]}
          />
        );
      })}
    </>
  );
}

export function TrendChart({ weeks, conditions, language, strings, width }: TrendChartProps) {
  const totals = weeks.map((week) => shownTotal(week, conditions));
  const highest = Math.max(...totals, 0);
  if (highest === 0) return <Muted>{strings.trendEmpty}</Muted>;
  const slot = width / weeks.length;
  const unit = (CHART_HEIGHT - LABEL_SPACE - TOP_SPACE) / highest;
  const lastIndex = weeks.length - 1;
  const description = weeks
    .map((week, index) =>
      fillTemplate(strings.trendWeekOf, { date: formatWeekStart(week.weekStart, language), count: totals[index] }),
    )
    .join('. ');
  return (
    <View accessible accessibilityLabel={description}>
      <Svg width={width} height={CHART_HEIGHT}>
        <SvgText x={0} y={12} fontSize={13} fill={colors['ink-muted']}>
          {highest}
        </SvgText>
        {weeks.map((week, index) => (
          <WeekBar key={week.weekStart} week={week} conditions={conditions} index={index} slot={slot} unit={unit} />
        ))}
        <SvgText x={0} y={CHART_HEIGHT - 4} fontSize={13} fill={colors['ink-muted']}>
          {formatWeekStart(weeks[0].weekStart, language)}
        </SvgText>
        <SvgText x={width} y={CHART_HEIGHT - 4} fontSize={13} fill={colors['ink-muted']} textAnchor="end">
          {formatWeekStart(weeks[lastIndex].weekStart, language)}
        </SvgText>
      </Svg>
    </View>
  );
}
