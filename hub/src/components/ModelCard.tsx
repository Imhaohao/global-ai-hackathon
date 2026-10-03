import { ArrowClockwise, CheckCircle, DownloadSimple, WarningCircle, X } from "phosphor-react-native";
import { ActivityIndicator, Text, View } from "react-native";

import type { LocalModelSpec } from "../../../shared/src/localModel/index.ts";
import { formatBytes } from "../format";
import type { LocalModelState } from "../localModel/useLocalModel";
import { iconColors } from "../theme";
import { ActionButton } from "./ActionButton";

interface ModelCardProps {
  spec: LocalModelSpec;
  state: LocalModelState;
  onDownload: () => void;
  onCancel: () => void;
  onRetry: () => void;
}

function ProgressBar({ done, total }: { done: number; total: number }) {
  const percent = total > 0 ? Math.min(100, Math.round((100 * done) / total)) : 0;
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: percent }}
      className="h-3 overflow-hidden rounded-full bg-sunken"
    >
      <View className="h-full rounded-full bg-accent" style={{ width: `${percent}%` }} />
    </View>
  );
}

function ReadyRow({ spec, usesGpu }: { spec: LocalModelSpec; usesGpu: boolean }) {
  return (
    <View className="flex-row items-center gap-3 rounded-card bg-surface p-4">
      <CheckCircle size={26} weight="fill" color={iconColors.accent} />
      <View className="flex-1">
        <Text className="text-lg font-semibold text-ink">Offline language model ready</Text>
        <Text className="text-sm text-ink-muted">
          {spec.displayName}, running on the {usesGpu ? "graphics chip" : "processor"}
        </Text>
      </View>
    </View>
  );
}

function CardBody({ spec, state, onDownload, onCancel, onRetry }: ModelCardProps) {
  switch (state.phase) {
    case "missing":
      return (
        <>
          <Text className="text-base text-ink-muted">
            Lets the hub understand Swahili texts when there is no internet. Download it once, over Wi-Fi if you can.
          </Text>
          <ActionButton label={`Download model (${formatBytes(state.bytesNeeded)})`} icon={DownloadSimple} tone="quiet" onPress={onDownload} />
        </>
      );
    case "downloading":
      return (
        <>
          <ProgressBar done={state.bytesDone} total={state.bytesTotal} />
          <Text className="text-base text-ink-muted">
            {formatBytes(state.bytesDone)} of {formatBytes(state.bytesTotal)}
          </Text>
          <ActionButton label="Cancel download" icon={X} tone="quiet" onPress={onCancel} />
        </>
      );
    case "loading":
      return (
        <View className="flex-row items-center gap-3">
          <ActivityIndicator color={iconColors.accent} />
          <Text className="flex-1 text-base text-ink-muted">Starting {spec.displayName}. This can take a minute.</Text>
        </View>
      );
    case "failed":
      return (
        <>
          <View className="flex-row items-start gap-3">
            <WarningCircle size={24} weight="fill" color={iconColors.ink} />
            <Text className="flex-1 text-base text-ink">{state.reason}</Text>
          </View>
          <ActionButton label="Try again" icon={ArrowClockwise} tone="quiet" onPress={onRetry} />
        </>
      );
    case "unsupported":
      return (
        <Text className="text-base text-ink">
          {spec.displayName} needs about {formatBytes(state.neededRamBytes)} of memory and this phone has{" "}
          {formatBytes(state.deviceRamBytes)}. The hub keeps answering with its built-in keyword rules.
        </Text>
      );
    default:
      return null;
  }
}

export function ModelCard(props: ModelCardProps) {
  if (props.state.phase === "ready") return <ReadyRow spec={props.spec} usesGpu={props.state.usesGpu} />;
  return (
    <View className="gap-4 rounded-card bg-surface p-5">
      <Text className="text-xl font-semibold text-ink">Offline language model</Text>
      <CardBody {...props} />
    </View>
  );
}
