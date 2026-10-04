import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import Svg, { Circle, G, Image as SvgImage, Line, Path, Rect, Text as SvgText } from 'react-native-svg';

import { markerRadius, type Hotspot, type MapLayout, type PlacedHotspot } from '../../../shared/src/hotspots.ts';
import { CONTROL_FOCUS_STYLE, useControlFocus } from '../components/useControlFocus';
import { fillTemplate, type Strings } from '../i18n/strings';
import { colors } from '../theme';
import { DISEASE_COLORS, readableTextOn } from './diseaseColors';
import { IMAGERY_CREDIT, tilesCovering } from './satelliteTiles';

const HEALTHY_RADIUS = 8;
const MINIMUM_HIT_SIZE = 44;
const HALO_SPREAD = 7;
const SCALE_BAR_CHOICES_METERS = [10, 20, 50, 100, 200, 500, 1000, 2000];
const SCALE_BAR_MAX_SHARE = 0.3;
const PLATE_OPACITY = 0.9;
const LABEL_SIZE = 13;

export const MAP_PADDING = 56;

type MapSize = { width: number; height: number };

type HotspotMapProps = MapSize & {
  layout: MapLayout;
  selectedId: string | null;
  showsSatellite: boolean;
  strings: Strings;
  onSelect: (hotspot: Hotspot) => void;
  children?: ReactNode;
};

function radiusOf(hotspot: Hotspot): number {
  return hotspot.condition === 'healthy' ? HEALTHY_RADIUS : markerRadius(hotspot.sightings.length);
}

function scaleBarMeters(width: number, metersPerPixel: number): number {
  const fitting = SCALE_BAR_CHOICES_METERS.filter((meters) => meters / metersPerPixel <= width * SCALE_BAR_MAX_SHARE);
  return fitting.length > 0 ? fitting[fitting.length - 1] : SCALE_BAR_CHOICES_METERS[0];
}

function gridOffsets(length: number, spacing: number): number[] {
  const stepsEachSide = Math.ceil(length / 2 / spacing);
  return Array.from({ length: stepsEachSide * 2 + 1 }, (_, index) => length / 2 + (index - stepsEachSide) * spacing);
}

function GroundGrid({ width, height, spacing }: MapSize & { spacing: number }) {
  return (
    <G>
      <Rect x={0} y={0} width={width} height={height} fill={colors.botanical} />
      {gridOffsets(width, spacing).map((x) => (
        <Line key={`x${x}`} x1={x} y1={0} x2={x} y2={height} stroke={colors.hairline} strokeWidth={1.5} />
      ))}
      {gridOffsets(height, spacing).map((y) => (
        <Line key={`y${y}`} x1={0} y1={y} x2={width} y2={y} stroke={colors.hairline} strokeWidth={1.5} />
      ))}
    </G>
  );
}

function SatelliteImagery({ layout, width, height }: MapSize & { layout: MapLayout }) {
  if (layout.center === null) return null;
  const tiles = tilesCovering({ ...layout.center, metersPerPixel: layout.metersPerPixel, width, height });
  return (
    <G>
      {tiles.map((tile) => (
        <SvgImage
          key={tile.key}
          href={{ uri: tile.url }}
          x={tile.x}
          y={tile.y}
          width={tile.size}
          height={tile.size}
          preserveAspectRatio="none"
        />
      ))}
    </G>
  );
}

function HotspotMarker({ placed, isSelected }: { placed: PlacedHotspot; isSelected: boolean }) {
  const { hotspot, x, y } = placed;
  const radius = radiusOf(hotspot);
  const color = DISEASE_COLORS[hotspot.condition];
  const count = hotspot.sightings.length;
  if (hotspot.condition === 'healthy') {
    return <Circle cx={x} cy={y} r={radius} fill={colors.surface} stroke={colors.healthy} strokeWidth={3} />;
  }
  return (
    <G>
      <Circle cx={x} cy={y} r={radius + HALO_SPREAD} fill={color} fillOpacity={0.3} />
      <Circle cx={x} cy={y} r={radius} fill={color} stroke={colors.surface} strokeWidth={2} />
      {count > 1 && (
        <SvgText x={x} y={y + 5} fontSize={14} fontWeight="bold" fill={readableTextOn(color)} textAnchor="middle">
          {count}
        </SvgText>
      )}
      {isSelected && (
        <G>
          <Circle cx={x} cy={y} r={radius + 4} fill="none" stroke={colors.surface} strokeWidth={3} />
          <Circle cx={x} cy={y} r={radius + 7} fill="none" stroke={colors.ink} strokeWidth={3} />
        </G>
      )}
    </G>
  );
}

function ScaleBar({ width, height, metersPerPixel, strings }: MapSize & { metersPerPixel: number; strings: Strings }) {
  const meters = scaleBarMeters(width, metersPerPixel);
  const length = meters / metersPerPixel;
  const top = height - 52;
  return (
    <G>
      <Rect x={12} y={top} width={length + 24} height={40} rx={12} fill={colors.surface} fillOpacity={PLATE_OPACITY} />
      <SvgText x={24} y={top + 17} fontSize={LABEL_SIZE} fontWeight="600" fill={colors.ink}>
        {fillTemplate(strings.mapScale, { meters })}
      </SvgText>
      <Line x1={24} y1={top + 28} x2={24 + length} y2={top + 28} stroke={colors.ink} strokeWidth={3} strokeLinecap="round" />
    </G>
  );
}

function NorthArrow({ width, strings }: { width: number; strings: Strings }) {
  const x = width - 32;
  return (
    <G>
      <Circle cx={x} cy={32} r={20} fill={colors.surface} fillOpacity={PLATE_OPACITY} />
      <Path d={`M ${x} 16 L ${x - 6} 30 L ${x + 6} 30 Z`} fill={colors.ink} />
      <SvgText x={x} y={45} fontSize={LABEL_SIZE} fontWeight="600" fill={colors.ink} textAnchor="middle">
        {strings.mapNorth.charAt(0)}
      </SvgText>
    </G>
  );
}

function ImageryCredit() {
  return (
    <View pointerEvents="none" className="absolute left-3 right-16 top-3 items-start">
      <Text numberOfLines={1} className="rounded-lg bg-surface/90 px-2 py-0.5 text-sm text-ink-muted">
        {IMAGERY_CREDIT}
      </Text>
    </View>
  );
}

function MarkerButton({
  placed,
  isSelected,
  strings,
  onSelect,
}: {
  placed: PlacedHotspot;
  isSelected: boolean;
  strings: Strings;
  onSelect: (hotspot: Hotspot) => void;
}) {
  const focus = useControlFocus();
  const size = Math.max(radiusOf(placed.hotspot) * 2 + HALO_SPREAD * 2, MINIMUM_HIT_SIZE);
  const disease = strings.diseases[placed.hotspot.condition].name;
  const count = fillTemplate(strings.hotspotSightings, { count: placed.hotspot.sightings.length });
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${disease}, ${count}`}
      accessibilityState={{ selected: isSelected }}
      onPress={() => onSelect(placed.hotspot)}
      onFocus={focus.onFocus}
      onBlur={focus.onBlur}
      style={[
        { position: 'absolute', left: placed.x - size / 2, top: placed.y - size / 2, width: size, height: size, borderRadius: size / 2 },
        focus.isFocused ? CONTROL_FOCUS_STYLE : undefined,
      ]}
    />
  );
}

export function HotspotMap({ layout, width, height, selectedId, showsSatellite, strings, onSelect, children }: HotspotMapProps) {
  const largestFirst = [...layout.placed].sort((first, second) => radiusOf(second.hotspot) - radiusOf(first.hotspot));
  const gridSpacing = scaleBarMeters(width, layout.metersPerPixel) / layout.metersPerPixel;
  const hasImagery = showsSatellite && layout.center !== null;
  return (
    <View style={{ width, height }} className="overflow-hidden rounded-card bg-botanical shadow-sm">
      <Svg width={width} height={height} accessible accessibilityLabel={strings.mapMapDescription}>
        <GroundGrid width={width} height={height} spacing={gridSpacing} />
        {hasImagery && <SatelliteImagery layout={layout} width={width} height={height} />}
        {largestFirst.map((placed) => (
          <HotspotMarker key={placed.hotspot.id} placed={placed} isSelected={placed.hotspot.id === selectedId} />
        ))}
        <NorthArrow width={width} strings={strings} />
        {layout.placed.length > 0 && (
          <ScaleBar width={width} height={height} metersPerPixel={layout.metersPerPixel} strings={strings} />
        )}
      </Svg>
      {hasImagery && <ImageryCredit />}
      {largestFirst.map((placed) => (
        <MarkerButton
          key={placed.hotspot.id}
          placed={placed}
          isSelected={placed.hotspot.id === selectedId}
          strings={strings}
          onSelect={onSelect}
        />
      ))}
      {children && (
        <View pointerEvents="box-none" className="absolute inset-0 items-center justify-center p-5">
          {children}
        </View>
      )}
    </View>
  );
}
