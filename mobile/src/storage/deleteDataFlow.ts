export function deleteDataWithCleanup(
  deleteAccountData: () => boolean,
  deleteExport: () => boolean,
): boolean {
  let accountDeleted = false;
  let exportDeleted = false;
  try {
    accountDeleted = deleteAccountData();
  } catch {
    accountDeleted = false;
  }
  try {
    exportDeleted = deleteExport();
  } catch {
    exportDeleted = false;
  }
  return accountDeleted && exportDeleted;
}
