import { Directory, File, Paths } from "expo-file-system";

import { filesNeeded, totalDownloadBytes } from "../../../shared/src/localModel/index.ts";
import type { LocalModelSpec, ModelFile } from "../../../shared/src/localModel/index.ts";

export function hubFiles(spec: LocalModelSpec): ModelFile[] {
  return filesNeeded(spec, { images: false });
}

function modelsRoot(): Directory {
  return new Directory(Paths.document, "models");
}

function modelDirectory(spec: LocalModelSpec): Directory {
  return new Directory(modelsRoot(), spec.id);
}

export function localFile(spec: LocalModelSpec, file: ModelFile): File {
  return new File(modelDirectory(spec), file.fileName);
}

function isComplete(spec: LocalModelSpec, file: ModelFile): boolean {
  const local = localFile(spec, file);
  return local.exists && local.size === file.bytes;
}

export function missingFiles(spec: LocalModelSpec): ModelFile[] {
  return hubFiles(spec).filter((file) => !isComplete(spec, file));
}

export function bytesStillNeeded(spec: LocalModelSpec): number {
  return totalDownloadBytes(missingFiles(spec));
}

export function hasRoomFor(bytes: number): boolean {
  return Paths.availableDiskSpace > bytes;
}

async function downloadOne(
  spec: LocalModelSpec,
  file: ModelFile,
  onBytes: (bytesWritten: number) => void,
  signal: AbortSignal,
): Promise<void> {
  const partial = new File(modelDirectory(spec), `${file.fileName}.part`);
  if (partial.exists) partial.delete();
  await File.downloadFileAsync(file.url, partial, {
    idempotent: true,
    signal,
    onProgress: ({ bytesWritten }) => onBytes(bytesWritten),
  });
  if (partial.size !== file.bytes) {
    partial.delete();
    throw new Error(`${file.fileName} arrived incomplete. Try the download again.`);
  }
  await partial.move(localFile(spec, file), { overwrite: true });
}

export async function downloadModel(
  spec: LocalModelSpec,
  onProgress: (bytesDone: number, bytesTotal: number) => void,
  signal: AbortSignal,
): Promise<void> {
  const directory = modelDirectory(spec);
  if (!directory.exists) directory.create({ intermediates: true });
  const pending = missingFiles(spec);
  const bytesTotal = totalDownloadBytes(pending);
  let bytesFinished = 0;
  for (const file of pending) {
    await downloadOne(spec, file, (written) => onProgress(bytesFinished + written, bytesTotal), signal);
    bytesFinished += file.bytes;
  }
}

export function removeOtherModels(keep: LocalModelSpec): void {
  const root = modelsRoot();
  if (!root.exists) return;
  for (const entry of root.list()) {
    if (entry instanceof Directory && entry.name !== keep.id) entry.delete();
  }
}
