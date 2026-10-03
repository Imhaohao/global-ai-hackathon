import type { Icon } from "phosphor-react-native";
import { Pressable, Text } from "react-native";

import { iconColors } from "../theme";

type Tone = "solid" | "inverse" | "quiet";

const TONES: Record<Tone, { surface: string; label: string; icon: string }> = {
  solid: { surface: "bg-accent active:bg-accent-pressed", label: "text-on-accent", icon: iconColors.onAccent },
  inverse: { surface: "bg-on-accent", label: "text-accent", icon: iconColors.accent },
  quiet: { surface: "bg-sunken", label: "text-ink", icon: iconColors.ink },
};

interface ActionButtonProps {
  label: string;
  icon: Icon;
  onPress: () => void;
  tone?: Tone;
}

export function ActionButton({ label, icon: IconGlyph, onPress, tone = "solid" }: ActionButtonProps) {
  const style = TONES[tone];
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className={`min-h-16 flex-row items-center justify-center gap-3 rounded-control px-5 active:scale-[0.96] ${style.surface}`}
    >
      <IconGlyph size={26} weight="fill" color={style.icon} />
      <Text className={`text-xl font-semibold ${style.label}`}>{label}</Text>
    </Pressable>
  );
}
