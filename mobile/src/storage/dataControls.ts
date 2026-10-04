import * as Sharing from 'expo-sharing';

import type { AppSettings } from './appSettings';
import { deleteEverything, getActiveAccountContext, isActiveAccountContext, writeExportFile } from './documentStore';
import { listObservations } from './observations';

export function deleteAllData(): void {
  deleteEverything();
}

export async function exportAllData(settings: AppSettings): Promise<boolean> {
  const account = getActiveAccountContext();
  if (!account) return false;
  if (!(await Sharing.isAvailableAsync())) return false;
  if (!isActiveAccountContext(account)) return false;
  const contents = JSON.stringify(
    { exportedAt: new Date().toISOString(), settings, observations: listObservations() },
    null,
    2,
  );
  await Sharing.shareAsync(writeExportFile(contents), {
    mimeType: 'application/json',
    UTI: 'public.json',
  });
  return true;
}
