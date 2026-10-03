import { Directory, File, Paths } from 'expo-file-system';

const APP_FOLDER = new Directory(Paths.document, 'leaf-doctor');

function fileAt(...segments: string[]): File {
  return new File(APP_FOLDER, ...segments);
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
  const directory = new Directory(APP_FOLDER, folder);
  if (!directory.exists) return [];
  return directory.list().filter((entry): entry is File => entry instanceof File && entry.name.endsWith('.json'));
}

export function copyIntoFolder(sourceUri: string, ...segments: string[]): string {
  const destination = fileAt(...segments);
  destination.create({ intermediates: true, overwrite: true });
  new File(sourceUri).copy(destination, { overwrite: true });
  return destination.uri;
}

export function deleteEverything(): void {
  if (APP_FOLDER.exists) APP_FOLDER.delete();
}

export function writeExportFile(contents: string): string {
  const file = new File(Paths.cache, 'leaf-doctor-export.json');
  file.create({ intermediates: true, overwrite: true });
  file.write(contents);
  return file.uri;
}
