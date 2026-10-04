import { useCallback, useState } from 'react';

import { DEFAULT_SETTINGS, loadSettings, saveSettings, type AppSettings } from './appSettings';
import { getActiveAccountContext, isActiveAccountContext } from './documentStore';

export function useAppSettings() {
  const [account] = useState(getActiveAccountContext);
  const [settings, setSettings] = useState<AppSettings>(loadSettings);

  const update = useCallback((changes: Partial<AppSettings>) => {
    setSettings((current) => {
      if (!isActiveAccountContext(account)) return current;
      const next = { ...current, ...changes };
      saveSettings(next);
      return next;
    });
  }, [account]);

  const resetToDefaults = useCallback(() => {
    if (isActiveAccountContext(account)) setSettings(DEFAULT_SETTINGS);
  }, [account]);

  return { settings, update, resetToDefaults };
}
