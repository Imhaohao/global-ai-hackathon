import { Image, View } from 'react-native';

const COFFEE_BRANCH = require('../../assets/coffee-branch.jpg');

export function BotanicalImage({ compact = false }: { compact?: boolean }) {
  return (
    <View
      className={`w-full self-center overflow-hidden rounded-card bg-botanical ${compact ? 'max-w-52' : 'max-w-sm'}`}
      style={{ aspectRatio: 1.2 }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Image source={COFFEE_BRANCH} className="h-full w-full" resizeMode="cover" accessibilityIgnoresInvertColors />
    </View>
  );
}
