import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const run = promisify(execFile);
const MAX_EDGE_PX = "1024";

export function expandHome(path: string): string {
  return path.startsWith("~/") ? join(homedir(), path.slice(2)) : path;
}

// HEIC, PNG and large JPEGs from iPhones and MMS are converted with macOS's built-in
// `sips` to a JPEG no larger than 1024 px, which keeps uploads small for Claude.
export async function preparePhoto(path: string): Promise<{ base64: string; mediaType: "image/jpeg" }> {
  const workDir = await mkdtemp(join(tmpdir(), "leaf-photo-"));
  const output = join(workDir, "leaf.jpg");
  try {
    await run("sips", ["-s", "format", "jpeg", "-Z", MAX_EDGE_PX, expandHome(path), "--out", output], { timeout: 20_000 });
    return { base64: (await readFile(output)).toString("base64"), mediaType: "image/jpeg" };
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}
