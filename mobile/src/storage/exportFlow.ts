export async function shareExportFile(
  writeFile: () => string,
  shareFile: (uri: string) => Promise<void>,
  cleanup: (uri: string) => boolean,
): Promise<boolean> {
  let uri: string | undefined;
  let shareSucceeded = false;
  try {
    uri = writeFile();
    await shareFile(uri);
    shareSucceeded = true;
  } catch {
    shareSucceeded = false;
  }
  if (!uri) return false;
  let cleanupSucceeded = false;
  try {
    cleanupSucceeded = cleanup(uri);
  } catch {
    cleanupSucceeded = false;
  }
  return shareSucceeded && cleanupSucceeded;
}
