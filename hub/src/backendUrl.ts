import { DEFAULT_BACKEND_URL } from "../../shared/src/index.ts";

export { DEFAULT_BACKEND_URL };

export function resolveBackendUrl(): string {
  return process.env.EXPO_PUBLIC_BACKEND_URL || DEFAULT_BACKEND_URL;
}
