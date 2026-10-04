import * as Sharing from 'expo-sharing';

import type { AppSettings } from './appSettings';
import {
  deleteEverything,
  deleteExportDirectory,
  deleteExportFile,
  getActiveAccountContext,
  getActiveAccountDataRevision,
  isActiveAccountContext,
  isActiveAccountDataRevision,
  writeExportFile,
} from './documentStore';
import { shareExportFile } from './exportFlow';
import { deleteDataWithCleanup } from './deleteDataFlow';
import { listObservations } from './observations';

export function deleteAllData(): boolean {
  const account = getActiveAccountContext();
  return deleteDataWithCleanup(deleteEverything, () => deleteExportDirectory(account?.accountId ?? null));
}

export async function exportAllData(settings: AppSettings): Promise<boolean> {
  const account = getActiveAccountContext();
  if (!account) return false;
  const dataRevision = getActiveAccountDataRevision();
  try {
    if (!(await Sharing.isAvailableAsync())) return false;
    if (!isActiveAccountContext(account) || !isActiveAccountDataRevision(dataRevision)) return false;
    const contents = JSON.stringify(
      { exportedAt: new Date().toISOString(), settings, observations: listObservations() },
      null,
      2,
    );
    if (!isActiveAccountContext(account) || !isActiveAccountDataRevision(dataRevision)) return false;
    return shareExportFile(
      () => writeExportFile(contents, account.accountId),
      (uri) => {
        if (!isActiveAccountContext(account) || !isActiveAccountDataRevision(dataRevision)) {
          throw new Error('account data changed while preparing export');
        }
        return Sharing.shareAsync(uri, {
          mimeType: 'application/json',
          UTI: 'public.json',
        });
      },
      deleteExportFile,
    );
  } catch {
    return false;
  }
}
