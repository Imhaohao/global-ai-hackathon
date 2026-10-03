import type { Icon } from 'phosphor-react-native';
import { View } from 'react-native';

import { colors } from '../theme';
import { Body } from './Typography';

type IconRowProps = { icon: Icon; text: string };

export function IconRow({ icon: IconComponent, text }: IconRowProps) {
  return (
    <View className="flex-row items-start gap-4">
      <View className="h-12 w-12 items-center justify-center rounded-full bg-healthy-soft">
        <IconComponent size={26} weight="duotone" color={colors.accent} />
      </View>
      <Body className="flex-1">{text}</Body>
    </View>
  );
}
