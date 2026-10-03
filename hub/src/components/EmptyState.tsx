import { ChatCircleText } from "phosphor-react-native";
import { Text, View } from "react-native";

import { iconColors } from "../theme";

export function EmptyState({ listening }: { listening: boolean }) {
  return (
    <View className="items-center gap-3 px-6 py-12">
      <ChatCircleText size={48} color={iconColors.muted} />
      <Text className="text-lg font-semibold text-ink">No texts answered yet</Text>
      <Text className="text-center text-base text-ink-muted">
        {listening
          ? "When a farmer texts this phone, the text and the reply appear here."
          : "Tap Start listening, then ask a farmer to text this phone."}
      </Text>
    </View>
  );
}
