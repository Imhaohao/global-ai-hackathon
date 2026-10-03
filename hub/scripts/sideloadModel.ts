import { execFileSync } from "node:child_process";
import { existsSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

import { activeLocalModel, filesNeeded, isLocalModelId, LOCAL_MODELS } from "../../shared/src/localModel/index.ts";
import type { LocalModelSpec } from "../../shared/src/localModel/index.ts";
import appConfig from "../app.json";

const APP_ID = appConfig.expo.android.package;
const MODELS_ROOT = process.env.LOCAL_MODELS_ROOT ?? join(homedir(), ".cache", "leaf-doctor", "models");

function chosenModel(): LocalModelSpec {
  const requested = process.env.LOCAL_MODEL_ID;
  if (!requested) return activeLocalModel();
  if (!isLocalModelId(requested)) throw new Error(`Unknown LOCAL_MODEL_ID ${requested}`);
  return LOCAL_MODELS[requested];
}

function adb(...args: string[]): void {
  execFileSync("adb", args, { stdio: "inherit" });
}

function sideload(spec: LocalModelSpec): void {
  const deviceDir = `files/models/${spec.id}`;
  adb("shell", "run-as", APP_ID, "mkdir", "-p", deviceDir);
  for (const file of filesNeeded(spec, { images: false })) {
    const source = join(MODELS_ROOT, spec.id, file.fileName);
    if (!existsSync(source) || statSync(source).size !== file.bytes) {
      throw new Error(`${source} is missing or incomplete; download it from ${file.url}`);
    }
    const staging = `/data/local/tmp/${file.fileName}`;
    adb("push", source, staging);
    adb("shell", "run-as", APP_ID, "cp", staging, `${deviceDir}/${file.fileName}`);
    adb("shell", "rm", staging);
  }
  console.log(`Sideloaded ${spec.displayName} into ${APP_ID}. Restart the app to load it.`);
}

sideload(chosenModel());
