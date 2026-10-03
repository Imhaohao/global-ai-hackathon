import { useCallback, useState } from 'react';

import { DEFAULT_SETTINGS, loadSettings, saveSettings, type AppSettings } from './appSettings';

export function useAppSettings() {
  const [settings, setSettings] = useState<AppSettings>(loadSettings);

  const update = useCallback((changes: Partial<AppSettings>) => {
    setSettings((current) => {
      const next = { ...current, ...changes };
      saveSettings(next);
      return next;
    });
  }, []);

  const resetToDefaults = useCallback(() => setSettings(DEFAULT_SETTINGS), []);

  return { settings, update, resetToDefaults };
}
