import { Play, Stop } from "phosphor-react-native";
import { Text, View } from "react-native";

import { ActionButton } from "./ActionButton";
import { PulsingDot } from "./PulsingDot";

interface ListeningControlProps {
  listening: boolean;
  onStart: () => void;
  onStop: () => void;
}

export function ListeningControl({ listening, onStart, onStop }: ListeningControlProps) {
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
      {listening ? (
        <ActionButton label="Stop listening" icon={Stop} tone="inverse" onPress={onStop} />
      ) : (
        <ActionButton label="Start listening" icon={Play} onPress={onStart} />
      )}
    </View>
  );
}
