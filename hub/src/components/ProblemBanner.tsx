import { WarningCircle } from "phosphor-react-native";
import { Text, View } from "react-native";

import { iconColors } from "../theme";
import type { HubProblem } from "../useSmsHub";

const PROBLEM_MESSAGES: Record<Exclude<HubProblem, null>, string> = {
  "permission-denied": "Allow SMS access for this app in Android Settings, then tap Start listening again.",
  "send-failed": "A reply did not send. Check that this phone has a SIM card and airtime.",
  "storage-failed": "SMS preferences could not be loaded or saved. Replies are paused. Check storage and restart the app. A STOP without confirmation must be retried.",
};

export function ProblemBanner({ problem }: { problem: HubProblem }) {
  if (!problem) return null;
  return (
    <View accessibilityRole="alert" className="flex-row items-start gap-3 rounded-control bg-sunken p-4">
      <WarningCircle size={24} weight="fill" color={iconColors.ink} />
      <Text className="flex-1 text-base text-ink">{PROBLEM_MESSAGES[problem]}</Text>
    </View>
  );
}
