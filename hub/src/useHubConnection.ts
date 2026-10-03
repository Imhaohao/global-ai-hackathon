import { useCallback, useEffect, useRef, useState } from "react";

import { resolveBackendUrl } from "./backendUrl";
import { checkHubToken } from "./checkHubToken";
import { clearHubToken, loadHubToken, saveHubToken } from "./hubConnection";

export type ConnectionStatus = "starting" | "signed-out" | "connected" | "saved-unreachable" | "saved-rejected";
export type TokenProblem = "rejected" | "unreachable" | null;

function statusForSavedToken(check: Awaited<ReturnType<typeof checkHubToken>>): ConnectionStatus {
  if (check === "valid") return "connected";
  return check === "rejected" ? "saved-rejected" : "saved-unreachable";
}

export function useHubConnection() {
  const tokenRef = useRef<string | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>("starting");
  const [checking, setChecking] = useState(false);
  const [formProblem, setFormProblem] = useState<TokenProblem>(null);

  const checkSavedToken = useCallback(async (saved: string) => {
    setChecking(true);
    const result = await checkHubToken(resolveBackendUrl(), saved);
    tokenRef.current = result === "rejected" ? null : saved;
    setStatus(statusForSavedToken(result));
    setChecking(false);
  }, []);

  useEffect(() => {
    void loadHubToken().then((saved) => {
      if (!saved) return setStatus("signed-out");
      tokenRef.current = saved;
      void checkSavedToken(saved);
    });
  }, [checkSavedToken]);

  const connect = useCallback(async (token: string) => {
    const trimmed = token.trim();
    if (!trimmed) return;
    setChecking(true);
    setFormProblem(null);
    const result = await checkHubToken(resolveBackendUrl(), trimmed);
    setChecking(false);
    if (result !== "valid") return setFormProblem(result);
    await saveHubToken(trimmed);
    tokenRef.current = trimmed;
    setStatus("connected");
  }, []);

  const disconnect = useCallback(async () => {
    await clearHubToken();
    tokenRef.current = null;
    setFormProblem(null);
    setStatus("signed-out");
  }, []);

  const recheck = useCallback(async () => {
    const saved = await loadHubToken();
    if (saved) await checkSavedToken(saved);
  }, [checkSavedToken]);

  return { tokenRef, status, checking, formProblem, connect, disconnect, recheck };
}
