import { ArrowClockwise, CloudCheck, CloudSlash, PlugsConnected, SignOut, WarningCircle } from "phosphor-react-native";
import type { Icon } from "phosphor-react-native";
import { useState } from "react";
import { ActivityIndicator, Text, TextInput, View } from "react-native";

import { iconColors } from "../theme";
import type { ConnectionStatus, TokenProblem } from "../useHubConnection";
import { ActionButton } from "./ActionButton";

interface ServerConnectionCardProps {
  status: ConnectionStatus;
  checking: boolean;
  formProblem: TokenProblem;
  onConnect: (token: string) => void;
  onDisconnect: () => void;
  onRecheck: () => void;
}

const PROBLEM_MESSAGES: Record<Exclude<TokenProblem, null>, string> = {
  rejected: "The server didn't accept this token. Check you copied all of it.",
  unreachable: "Couldn't reach the Leaf Doctor server. Check the signal and try again.",
};

function StatusHeader({ icon: Glyph, color, title, message }: { icon: Icon; color: string; title: string; message: string }) {
  return (
    <View className="flex-row items-start gap-3">
      <View className="shrink-0 pt-0.5">
        <Glyph size={28} weight="fill" color={color} />
      </View>
      <View className="flex-1">
        <Text className="text-lg font-semibold text-ink">{title}</Text>
        <Text className="text-base text-ink-muted">{message}</Text>
      </View>
    </View>
  );
}

function CheckingRow() {
  return (
    <View className="flex-row items-center gap-3 rounded-card bg-surface p-5">
      <ActivityIndicator color={iconColors.accent} />
      <Text className="flex-1 text-base text-ink-muted">Checking the saved token with the Leaf Doctor server.</Text>
    </View>
  );
}

function ConnectedPanel({ onDisconnect }: { onDisconnect: () => void }) {
  return (
    <View className="gap-4 rounded-card bg-surface p-5">
      <StatusHeader
        icon={CloudCheck}
        color={iconColors.accent}
        title="Connected to Leaf Doctor server"
        message="Texts are answered online first. The offline rules take over when there is no signal."
      />
      <ActionButton label="Disconnect" icon={SignOut} tone="quiet" onPress={onDisconnect} />
    </View>
  );
}

function SavedUnreachablePanel({ checking, onRecheck, onDisconnect }: Pick<ServerConnectionCardProps, "checking" | "onRecheck" | "onDisconnect">) {
  return (
    <View className="gap-4 rounded-card bg-surface p-5">
      <StatusHeader
        icon={CloudSlash}
        color={iconColors.muted}
        title="Token saved, server out of reach"
        message="The hub keeps answering from the rules on this phone and will use the server when the signal returns."
      />
      <ActionButton label="Check again" icon={ArrowClockwise} tone="quiet" busy={checking} onPress={onRecheck} />
      <ActionButton label="Disconnect" icon={SignOut} tone="quiet" onPress={onDisconnect} />
    </View>
  );
}

function ProblemNote({ message }: { message: string }) {
  return (
    <View accessibilityRole="alert" className="flex-row items-start gap-3 rounded-control bg-sunken p-4">
      <WarningCircle size={24} weight="fill" color={iconColors.ink} />
      <Text className="flex-1 text-base text-ink">{message}</Text>
    </View>
  );
}

function ConnectForm({ checking, problem, onConnect }: { checking: boolean; problem: string | null; onConnect: (token: string) => void }) {
  const [token, setToken] = useState("");
  return (
    <View className="gap-4 rounded-card bg-surface p-5">
      <Text className="text-xl font-semibold text-ink">Leaf Doctor server</Text>
      <View className="gap-2">
        <Text className="text-base text-ink">Server access token</Text>
        <TextInput
          value={token}
          onChangeText={setToken}
          secureTextEntry
          editable={!checking}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="Paste the token you were given"
          placeholderTextColor={iconColors.muted}
          className="min-h-14 rounded-control border border-sunken bg-paper px-4 text-base text-ink"
        />
        <Text className="text-sm text-ink-muted">Without it, the hub answers from the rules stored on this phone.</Text>
      </View>
      {problem && <ProblemNote message={problem} />}
      <ActionButton
        label={checking ? "Checking token" : "Connect to Leaf Doctor server"}
        icon={PlugsConnected}
        tone="solid"
        busy={checking}
        onPress={() => onConnect(token)}
      />
    </View>
  );
}

function formProblemMessage(status: ConnectionStatus, formProblem: TokenProblem): string | null {
  if (formProblem) return PROBLEM_MESSAGES[formProblem];
  if (status === "saved-rejected") return "The server no longer accepts the saved token. Paste a new one.";
  return null;
}

export function ServerConnectionCard(props: ServerConnectionCardProps) {
  const { status, checking, formProblem, onConnect, onDisconnect, onRecheck } = props;
  if (status === "starting") return <CheckingRow />;
  if (status === "connected") return <ConnectedPanel onDisconnect={onDisconnect} />;
  if (status === "saved-unreachable") {
    return <SavedUnreachablePanel checking={checking} onRecheck={onRecheck} onDisconnect={onDisconnect} />;
  }
  return <ConnectForm checking={checking} problem={formProblemMessage(status, formProblem)} onConnect={onConnect} />;
}
