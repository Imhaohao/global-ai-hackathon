import "./global.css";

import { StatusBar } from "expo-status-bar";
import { FlatList, Text, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

import { EmptyState } from "./src/components/EmptyState";
import { ExchangeCard } from "./src/components/ExchangeCard";
import { ListeningControl } from "./src/components/ListeningControl";
import { ProblemBanner } from "./src/components/ProblemBanner";
import { useSmsHub } from "./src/useSmsHub";

export default function App() {
  const { listening, exchanges, problem, start, stop } = useSmsHub();

  return (
    <SafeAreaProvider>
      <SafeAreaView className="flex-1 bg-paper">
        <StatusBar style="dark" />
        <FlatList
          data={exchanges}
          keyExtractor={(exchange) => exchange.id}
          renderItem={({ item }) => <ExchangeCard exchange={item} />}
          ItemSeparatorComponent={() => <View className="h-3" />}
          ListEmptyComponent={<EmptyState listening={listening} />}
          contentContainerClassName="gap-0 p-4"
          ListHeaderComponent={
            <View className="mb-5 gap-4">
              <Text className="text-3xl font-bold text-ink">Leaf Doctor Hub</Text>
              <ListeningControl listening={listening} onStart={() => void start()} onStop={stop} />
              <ProblemBanner problem={problem} />
              {exchanges.length > 0 && <Text className="text-xl font-semibold text-ink">Recent texts</Text>}
            </View>
          }
        />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
