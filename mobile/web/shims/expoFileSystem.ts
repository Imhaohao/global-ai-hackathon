// Browser stand-in for the subset of expo-file-system the app uses. Files live in memory, so
// every page load starts a fresh demo. A copied photo keeps serving its source blob URL,
// because a browser <img> cannot read a virtual path.
const COPY_MARKER = 'copy-of:';

const files = new Map<string, string>();

function joinPath(parent: Directory | File | string, segments: string[]): string {
  const base = typeof parent === 'string' ? parent : parent.path;
  return [base.replace(/\/+$/, ''), ...segments].join('/');
}

function isExternalUri(uri: string): boolean {
  return /^(blob:|data:|https?:)/.test(uri);
}

export class File {
  readonly path: string;

  constructor(parent: Directory | File | string, ...segments: string[]) {
    this.path = segments.length === 0 && typeof parent === 'string' ? parent : joinPath(parent, segments);
  }

  get uri(): string {
    const contents = files.get(this.path);
    return contents?.startsWith(COPY_MARKER) ? contents.slice(COPY_MARKER.length) : this.path;
  }

  get name(): string {
    return this.path.split('/').pop() ?? '';
  }

  get exists(): boolean {
    return files.has(this.path) || isExternalUri(this.path);
  }

  create(): void {
    if (!files.has(this.path)) files.set(this.path, '');
  }

  write(contents: string): void {
    files.set(this.path, contents);
  }

  textSync(): string {
    const contents = files.get(this.path);
    if (contents === undefined) throw new Error(`No such file: ${this.path}`);
    return contents;
  }

  copy(destination: File): void {
    files.set(destination.path, files.get(this.path) ?? COPY_MARKER + this.path);
  }

  delete(): void {
    files.delete(this.path);
  }
}

export class Directory {
  readonly path: string;

  constructor(parent: Directory | string, ...segments: string[]) {
    this.path = joinPath(parent, segments);
  }

  get uri(): string {
    return this.path;
  }

  private get prefix(): string {
    return `${this.path}/`;
  }

  get exists(): boolean {
    return [...files.keys()].some((path) => path.startsWith(this.prefix));
  }

  create(): void {}

  list(): (File | Directory)[] {
    const children = new Map<string, File | Directory>();
    for (const path of files.keys()) {
      if (!path.startsWith(this.prefix)) continue;
      const [child, ...rest] = path.slice(this.prefix.length).split('/');
      children.set(child, rest.length === 0 ? new File(this, child) : new Directory(this, child));
    }
    return [...children.values()];
  }

  delete(): void {
    for (const path of [...files.keys()]) {
      if (path.startsWith(this.prefix)) files.delete(path);
    }
  }
}

export const Paths = {
  document: 'web-fs://document',
  cache: 'web-fs://cache',
};
