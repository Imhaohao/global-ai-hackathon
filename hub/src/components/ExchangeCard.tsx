import { Translate, WifiHigh, WifiSlash } from "phosphor-react-native";
import { Text, View } from "react-native";

import { describeReading, formatTime, maskSender } from "../format";
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
      {exchange.modelReading && (
        <View
          accessible
          accessibilityLabel={`On-device model read this as: ${describeReading(exchange.modelReading)}`}
          className="mb-3 flex-row items-start gap-2"
        >
          <Translate size={20} color={iconColors.muted} />
          <Text className="flex-1 text-sm text-ink-muted">{describeReading(exchange.modelReading)}</Text>
        </View>
      )}
      <View className="rounded-control bg-reply p-3">
        <Text className="text-base text-ink">{exchange.reply}</Text>
      </View>
    </View>
  );
}
