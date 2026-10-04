import { Directory, File, Paths } from 'expo-file-system';
import { accountStorageSegments } from '../auth/session';

const LEGACY_FOLDER = new Directory(Paths.document, 'leaf-doctor');
const SIGNED_OUT_FOLDER = new Directory(LEGACY_FOLDER, 'signed-out');
const EXPORTS_FOLDER = new Directory(Paths.cache, 'leaf-doctor-exports');
let activeFolder = SIGNED_OUT_FOLDER;
let activeAccountId: string | null = null;
let activeAccountRevision = 0;
let activeAccountDataRevision = 0;
let exportSequence = 0;

export type ActiveAccountContext = { accountId: string; revision: number };

export function getActiveAccountContext(): ActiveAccountContext | null {
  return activeAccountId ? { accountId: activeAccountId, revision: activeAccountRevision } : null;
}

export function isActiveAccountContext(context: ActiveAccountContext | null): context is ActiveAccountContext {
  return Boolean(context && context.accountId === activeAccountId && context.revision === activeAccountRevision);
}

export function getActiveAccountDataRevision(): number {
  return activeAccountDataRevision;
}

export function isActiveAccountDataRevision(revision: number): boolean {
  return revision === activeAccountDataRevision;
}

export function setActiveAccount(accountId: string): void {
  if (activeAccountId === accountId) return;
  activeFolder = new Directory(LEGACY_FOLDER, ...accountStorageSegments(accountId));
  activeAccountId = accountId;
  activeAccountRevision += 1;
}

export function clearActiveAccount(): void {
  activeFolder = SIGNED_OUT_FOLDER;
  activeAccountId = null;
  activeAccountRevision += 1;
}

function fileAt(...segments: string[]): File {
  return new File(activeFolder, ...segments);
}

export function readJson<T>(fallback: T, ...segments: string[]): T {
  const file = fileAt(...segments);
  if (!file.exists) return fallback;
  try {
    return JSON.parse(file.textSync()) as T;
  } catch {
    return fallback;
  }
}

export function writeJson(value: unknown, ...segments: string[]): void {
  const file = fileAt(...segments);
  file.create({ intermediates: true, overwrite: true });
  file.write(JSON.stringify(value, null, 2));
}

export function listJsonFiles(folder: string): File[] {
  const directory = new Directory(activeFolder, folder);
  if (!directory.exists) return [];
  return directory.list().filter((entry): entry is File => entry instanceof File && entry.name.endsWith('.json'));
}

export function copyIntoFolder(sourceUri: string, ...segments: string[]): string {
  const destination = fileAt(...segments);
  destination.create({ intermediates: true, overwrite: true });
  new File(sourceUri).copy(destination, { overwrite: true });
  return destination.uri;
}

export function deleteEverything(): boolean {
  activeAccountDataRevision += 1;
  try {
    if (!activeAccountId || !activeFolder.exists) return true;
    activeFolder.delete();
    return true;
  } catch {
    return false;
  }
}

export function deleteFile(...segments: string[]): boolean {
  try {
    const file = fileAt(...segments);
    if (!file.exists) return true;
    file.delete();
    return true;
  } catch {
    return false;
  }
}

function exportFolder(accountId: string): Directory {
  const [, safeAccountId] = accountStorageSegments(accountId);
  return new Directory(EXPORTS_FOLDER, safeAccountId);
}

function nextExportName(): string {
  return `export-${Date.now()}-${exportSequence++}-${Math.random().toString(36).slice(2, 10)}.json`;
}

export function deleteExportDirectory(accountId: string | null): boolean {
  if (!accountId) return true;
  try {
    const directory = exportFolder(accountId);
    if (!directory.exists) return true;
    directory.delete();
    return true;
  } catch {
    return false;
  }
}

export function deleteExportFile(uri: string): boolean {
  try {
    const file = new File(uri);
    if (!file.exists) return true;
    file.delete();
    return true;
  } catch {
    return false;
  }
}

export function writeExportFile(contents: string, accountId: string): string {
  const file = new File(exportFolder(accountId), nextExportName());
  try {
    file.create({ intermediates: true, overwrite: true });
    file.write(contents);
    return file.uri;
  } catch (error) {
    if (file.exists) file.delete();
    throw error;
  }
}
