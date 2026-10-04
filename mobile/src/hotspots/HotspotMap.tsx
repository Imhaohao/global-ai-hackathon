import Svg, { Circle, G, Path, Rect, Line, Text as SvgText } from 'react-native-svg';

import { markerRadius, type Hotspot, type MapLayout, type PlacedHotspot } from '../../../shared/src/hotspots.ts';
import { fillTemplate, type Strings } from '../i18n/strings';
import { colors } from '../theme';
import { DISEASE_COLORS } from './diseaseColors';

const HEALTHY_RADIUS = 8;
const MINIMUM_TOUCH_RADIUS = 24;
const SCALE_BAR_CHOICES_METERS = [10, 20, 50, 100, 200, 500, 1000, 2000];
const SCALE_BAR_MAX_SHARE = 0.35;

export const MAP_PADDING = 56;
export const MAP_HEIGHT = 340;

type HotspotMapProps = {
  layout: MapLayout;
  width: number;
  selectedId: string | null;
  strings: Strings;
  onSelect: (hotspot: Hotspot) => void;
};

function radiusOf(hotspot: Hotspot): number {
  return hotspot.condition === 'healthy' ? HEALTHY_RADIUS : markerRadius(hotspot.sightings.length);
}

function scaleBarMeters(width: number, metersPerPixel: number): number {
  const fitting = SCALE_BAR_CHOICES_METERS.filter((meters) => meters / metersPerPixel <= width * SCALE_BAR_MAX_SHARE);
  return fitting.length > 0 ? fitting[fitting.length - 1] : SCALE_BAR_CHOICES_METERS[0];
}

function HotspotMarker({
  placed,
  isSelected,
  onSelect,
}: {
  placed: PlacedHotspot;
  isSelected: boolean;
  onSelect: (hotspot: Hotspot) => void;
}) {
  const { hotspot, x, y } = placed;
  const radius = radiusOf(hotspot);
  const color = DISEASE_COLORS[hotspot.condition];
  const isHealthy = hotspot.condition === 'healthy';
  const count = hotspot.sightings.length;
  return (
    <G onPress={() => onSelect(hotspot)}>
      <Circle cx={x} cy={y} r={Math.max(radius + 6, MINIMUM_TOUCH_RADIUS)} fill="transparent" />
      <Circle
        cx={x}
        cy={y}
        r={radius}
        fill={isHealthy ? 'none' : color}
        fillOpacity={isHealthy ? 0 : 0.55}
        stroke={color}
        strokeWidth={2}
      />
      {count > 1 && !isHealthy && (
        <SvgText x={x} y={y + 5} fontSize={14} fontWeight="bold" fill={colors.ink} textAnchor="middle">
          {count}
        </SvgText>
      )}
      {isSelected && <Circle cx={x} cy={y} r={radius + 5} fill="none" stroke={colors.ink} strokeWidth={3} />}
    </G>
  );
}

function ScaleBar({ width, metersPerPixel, strings }: { width: number; metersPerPixel: number; strings: Strings }) {
  const meters = scaleBarMeters(width, metersPerPixel);
  const length = meters / metersPerPixel;
  const y = MAP_HEIGHT - 20;
  return (
    <G>
      <Line x1={16} y1={y} x2={16 + length} y2={y} stroke={colors.ink} strokeWidth={3} />
      <SvgText x={16} y={y - 8} fontSize={13} fill={colors.ink}>
        {fillTemplate(strings.mapScale, { meters })}
      </SvgText>
    </G>
  );
}

function NorthArrow({ width, strings }: { width: number; strings: Strings }) {
  const x = width - 28;
  return (
    <G>
      <Path d={`M ${x} 16 L ${x - 8} 36 L ${x + 8} 36 Z`} fill={colors.ink} />
      <SvgText x={x} y={54} fontSize={13} fill={colors.ink} textAnchor="middle">
        {strings.mapNorth.charAt(0)}
      </SvgText>
    </G>
  );
}

export function HotspotMap({ layout, width, selectedId, strings, onSelect }: HotspotMapProps) {
  const largestFirst = [...layout.placed].sort((first, second) => radiusOf(second.hotspot) - radiusOf(first.hotspot));
  return (
    <Svg
      width={width}
      height={MAP_HEIGHT}
      accessible
      accessibilityLabel={strings.mapMapDescription}
    >
      <Rect x={0} y={0} width={width} height={MAP_HEIGHT} rx={28} fill={colors.surface} />
      <NorthArrow width={width} strings={strings} />
      {largestFirst.map((placed) => (
        <HotspotMarker
          key={placed.hotspot.id}
          placed={placed}
          isSelected={placed.hotspot.id === selectedId}
          onSelect={onSelect}
        />
      ))}
      <ScaleBar width={width} metersPerPixel={layout.metersPerPixel} strings={strings} />
    </Svg>
  );
}
