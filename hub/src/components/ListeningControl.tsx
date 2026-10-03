import { Play, Stop } from "phosphor-react-native";
import { Pressable, Text, View } from "react-native";

import { iconColors } from "../theme";
import { PulsingDot } from "./PulsingDot";

interface ListeningControlProps {
  listening: boolean;
  onStart: () => void;
  onStop: () => void;
}

export function ListeningControl({ listening, onStart, onStop }: ListeningControlProps) {
  const Icon = listening ? Stop : Play;
  return (
    <View className={`rounded-card p-5 ${listening ? "bg-accent" : "bg-surface"}`}>
      <View className="mb-5 flex-row items-center gap-3">
        <PulsingDot active={listening} />
        <Text className={`text-2xl font-semibold ${listening ? "text-on-accent" : "text-ink"}`}>
          {listening ? "Listening for texts" : "Not listening"}
        </Text>
      </View>
      {!listening && (
        <Text className="mb-5 text-base text-ink-muted">
          Replies only go out while this app is open on screen.
        </Text>
      )}
      <Pressable
        accessibilityRole="button"
        onPress={listening ? onStop : onStart}
        className={`min-h-16 flex-row items-center justify-center gap-3 rounded-control active:scale-[0.96] ${
          listening ? "bg-on-accent" : "bg-accent active:bg-accent-pressed"
        }`}
      >
        <Icon size={28} weight="fill" color={listening ? iconColors.accent : iconColors.onAccent} />
        <Text className={`text-xl font-semibold ${listening ? "text-accent" : "text-on-accent"}`}>
          {listening ? "Stop listening" : "Start listening"}
        </Text>
      </Pressable>
    </View>
  );
}
