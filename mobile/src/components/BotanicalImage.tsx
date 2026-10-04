import { Image, useWindowDimensions, View } from 'react-native';

const COFFEE_BRANCH = require('../../assets/coffee-branch.jpg');

export function BotanicalImage({ compact = false }: { compact?: boolean }) {
  const { width } = useWindowDimensions();
  const imageWidth = Math.min(width - 40, compact ? 208 : 384);
  return (
    <View
      className="self-center overflow-hidden rounded-card bg-botanical"
      style={{ width: imageWidth, height: imageWidth / 1.2 }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Image source={COFFEE_BRANCH} className="h-full w-full" resizeMode="cover" accessibilityIgnoresInvertColors />
    </View>
  );
}
