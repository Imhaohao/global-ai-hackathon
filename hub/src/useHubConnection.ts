import { useCallback, useEffect, useRef, useState } from "react";

import { clearHubToken, loadHubToken, saveHubToken } from "./hubConnection";

export function useHubConnection() {
  const tokenRef = useRef<string | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    void loadHubToken().then((saved) => {
      tokenRef.current = saved;
      setConnected(Boolean(saved));
    });
  }, []);

  const connect = useCallback(async (token: string) => {
    const trimmed = token.trim();
    if (!trimmed) return;
    await saveHubToken(trimmed);
    tokenRef.current = trimmed;
    setConnected(true);
  }, []);

  const disconnect = useCallback(async () => {
    await clearHubToken();
    tokenRef.current = null;
    setConnected(false);
  }, []);

  return { tokenRef, connected, connect, disconnect };
}
