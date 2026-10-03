import * as SecureStore from "expo-secure-store";

const TOKEN_KEY = "leaf-doctor-hub-token";

export async function loadHubToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function saveHubToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token.trim());
}

export async function clearHubToken(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}
