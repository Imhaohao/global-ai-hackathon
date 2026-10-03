import { WifiHigh, WifiSlash } from "phosphor-react-native";
import { Text, View } from "react-native";

import { formatTime, maskSender } from "../format";
import { iconColors } from "../theme";
import type { Exchange } from "../useSmsHub";

export function ExchangeCard({ exchange }: { exchange: Exchange }) {
  const online = exchange.source === "online";
  const SourceIcon = online ? WifiHigh : WifiSlash;
  return (
    <View className="rounded-card bg-surface p-4">
      <View className="mb-3 flex-row items-center justify-between">
        <Text className="text-lg font-semibold text-ink">Phone ending {maskSender(exchange.from)}</Text>
        <View className="flex-row items-center gap-2">
          <Text className="text-sm text-ink-muted">{formatTime(exchange.receivedAt)}</Text>
          <View accessible accessibilityLabel={online ? "Answered online" : "Answered offline"}>
            <SourceIcon size={22} color={iconColors.muted} weight={online ? "bold" : "regular"} />
          </View>
        </View>
      </View>
      <Text className="mb-3 text-base text-ink">{exchange.question}</Text>
      <View className="rounded-control bg-reply p-3">
        <Text className="text-base text-ink">{exchange.reply}</Text>
      </View>
    </View>
  );
}
