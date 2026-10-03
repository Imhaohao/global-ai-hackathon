export const DEFAULT_BACKEND_URL = "https://ideal-civet-53.convex.site";

export function resolveBackendUrl(): string {
  return process.env.EXPO_PUBLIC_BACKEND_URL || DEFAULT_BACKEND_URL;
}
