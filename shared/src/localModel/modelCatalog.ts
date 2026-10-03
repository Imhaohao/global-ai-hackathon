export interface ModelFile {
  role: "weights" | "vision";
  fileName: string;
  url: string;
  bytes: number;
}

export interface LocalModelSpec {
  id: string;
  displayName: string;
  license: string;
  sourceRepo: string;
  files: ModelFile[];
  supportsImages: boolean;
  chatTemplateOptions?: Record<string, unknown>;
}

function huggingFaceFile(repo: string, role: ModelFile["role"], fileName: string, bytes: number): ModelFile {
  return { role, fileName, url: `https://huggingface.co/${repo}/resolve/main/${fileName}`, bytes };
}

const QWEN_SMALL_REPO = "unsloth/Qwen3.5-0.8B-GGUF";
const QWEN_2B_REPO = "unsloth/Qwen3.5-2B-GGUF";

export const LOCAL_MODELS = {
  "qwen3.5-0.8b": {
    id: "qwen3.5-0.8b",
    displayName: "Qwen3.5 0.8B (Q4_K_M)",
    license: "Apache-2.0",
    sourceRepo: QWEN_SMALL_REPO,
    files: [
      huggingFaceFile(QWEN_SMALL_REPO, "weights", "Qwen3.5-0.8B-Q4_K_M.gguf", 532_517_120),
      huggingFaceFile(QWEN_SMALL_REPO, "vision", "mmproj-F16.gguf", 204_987_232),
    ],
    supportsImages: true,
    chatTemplateOptions: { enable_thinking: false },
  },
  "qwen3.5-2b": {
    id: "qwen3.5-2b",
    displayName: "Qwen3.5 2B (Q4_K_M)",
    license: "Apache-2.0",
    sourceRepo: QWEN_2B_REPO,
    files: [
      huggingFaceFile(QWEN_2B_REPO, "weights", "Qwen3.5-2B-Q4_K_M.gguf", 1_280_835_840),
      huggingFaceFile(QWEN_2B_REPO, "vision", "mmproj-F16.gguf", 668_227_264),
    ],
    supportsImages: true,
    chatTemplateOptions: { enable_thinking: false },
  },
} satisfies Record<string, LocalModelSpec>;

export type LocalModelId = keyof typeof LOCAL_MODELS;

export const ACTIVE_LOCAL_MODEL_ID: LocalModelId = "qwen3.5-2b";

export function isLocalModelId(id: string): id is LocalModelId {
  return Object.hasOwn(LOCAL_MODELS, id);
}

export function activeLocalModel(): LocalModelSpec {
  return LOCAL_MODELS[ACTIVE_LOCAL_MODEL_ID];
}

export function totalDownloadBytes(spec: LocalModelSpec): number {
  return spec.files.reduce((sum, file) => sum + file.bytes, 0);
}

export function llamaServerCommand(spec: LocalModelSpec, modelsRoot: string, port: number): string {
  const modelDir = `${modelsRoot}/${spec.id}`;
  const weights = spec.files.find((file) => file.role === "weights");
  const vision = spec.files.find((file) => file.role === "vision");
  if (!weights) throw new Error(`${spec.id} has no weights file`);
  const visionFlag = vision ? ` --mmproj ${modelDir}/${vision.fileName}` : "";
  return `llama-server -m ${modelDir}/${weights.fileName}${visionFlag} --port ${port} -c 4096`;
}
