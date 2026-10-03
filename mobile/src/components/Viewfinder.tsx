import { Leaf } from 'phosphor-react-native';
import { ActivityIndicator, Image, View } from 'react-native';

import { colors } from '../theme';

const CORNER_POSITIONS = [
  'left-0 top-0 border-l-4 border-t-4',
  'right-0 top-0 border-r-4 border-t-4',
  'bottom-0 left-0 border-b-4 border-l-4',
  'bottom-0 right-0 border-b-4 border-r-4',
];

type ViewfinderProps = { photoUri?: string; isChecking?: boolean; compact?: boolean };

export function Viewfinder({ photoUri, isChecking = false, compact = false }: ViewfinderProps) {
  return (
    <View className={`aspect-square items-center justify-center self-center p-5 ${compact ? 'w-52' : 'w-full max-w-sm'}`}>
      {CORNER_POSITIONS.map((position) => (
        <View key={position} className={`absolute h-12 w-12 border-accent ${position}`} />
      ))}
      <View className="h-full w-full items-center justify-center overflow-hidden rounded-card bg-healthy-soft">
        {photoUri ? (
          <Image source={{ uri: photoUri }} className="h-full w-full" accessibilityIgnoresInvertColors />
        ) : (
          <Leaf size={compact ? 96 : 200} weight="duotone" color={colors.accent} />
        )}
        {isChecking && (
          <View className="absolute inset-0 items-center justify-center bg-ink/40">
            <ActivityIndicator size="large" color={colors.surface} />
          </View>
        )}
      </View>
    </View>
  );
}
