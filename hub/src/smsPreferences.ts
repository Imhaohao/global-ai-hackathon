import * as SecureStore from "expo-secure-store";
import { normalizeSmsSender } from "./smsPreferenceState";

const OPTED_OUT_SENDERS_KEY = "leaf-doctor-hub-opted-out-senders";

export interface SmsPreferences {
  loadOptedOutSenders(): Promise<Set<string>>;
  saveOptedOutSenders(senders: Set<string>): Promise<void>;
}

export function createSecureSmsPreferences(): SmsPreferences {
  return {
    async loadOptedOutSenders() {
      const saved = await SecureStore.getItemAsync(OPTED_OUT_SENDERS_KEY);
      if (!saved) return new Set<string>();
      const parsed: unknown = JSON.parse(saved);
      if (!Array.isArray(parsed) || !parsed.every((sender) => typeof sender === "string")) {
        throw new Error("Stored SMS preferences are invalid");
      }
      return new Set(parsed.map(normalizeSmsSender).filter(Boolean));
    },
    async saveOptedOutSenders(senders) {
      await SecureStore.setItemAsync(OPTED_OUT_SENDERS_KEY, JSON.stringify([...senders].map(normalizeSmsSender).filter(Boolean)));
    },
  };
}

export const secureSmsPreferences = createSecureSmsPreferences();
