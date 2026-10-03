import { CloudCheck, PlugsConnected, SignOut } from "phosphor-react-native";
import { useState } from "react";
import { Text, TextInput, View } from "react-native";

import { iconColors } from "../theme";
import { ActionButton } from "./ActionButton";

interface ServerConnectionCardProps {
  connected: boolean;
  onConnect: (token: string) => void;
  onDisconnect: () => void;
}

function ConnectedRow({ onDisconnect }: { onDisconnect: () => void }) {
  return (
    <View className="gap-4 rounded-card bg-surface p-5">
      <View className="flex-row items-center gap-3">
        <CloudCheck size={26} weight="fill" color={iconColors.accent} />
        <View className="flex-1">
          <Text className="text-lg font-semibold text-ink">Connected to Leaf Doctor server</Text>
          <Text className="text-sm text-ink-muted">Texts are answered online first. The offline rules take over when there is no signal.</Text>
        </View>
      </View>
      <ActionButton label="Disconnect" icon={SignOut} tone="quiet" onPress={onDisconnect} />
    </View>
  );
}

function ConnectForm({ onConnect }: { onConnect: (token: string) => void }) {
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
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="Paste the token you were given"
          placeholderTextColor={iconColors.muted}
          className="min-h-14 rounded-control border border-sunken bg-paper px-4 text-base text-ink"
        />
        <Text className="text-sm text-ink-muted">Without it, the hub answers from the rules stored on this phone.</Text>
      </View>
      <ActionButton
        label="Connect to Leaf Doctor server"
        icon={PlugsConnected}
        tone="solid"
        onPress={() => {
          onConnect(token);
          setToken("");
        }}
      />
    </View>
  );
}

export function ServerConnectionCard({ connected, onConnect, onDisconnect }: ServerConnectionCardProps) {
  if (connected) return <ConnectedRow onDisconnect={onDisconnect} />;
  return <ConnectForm onConnect={onConnect} />;
}
