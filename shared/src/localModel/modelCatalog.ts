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

const QWEN_REPO = "https://huggingface.co/unsloth/Qwen3.5-0.8B-GGUF/resolve/main";

export const LOCAL_MODELS = {
  "qwen3.5-0.8b": {
    id: "qwen3.5-0.8b",
    displayName: "Qwen3.5 0.8B (Q4_K_M)",
    license: "Apache-2.0",
    sourceRepo: "unsloth/Qwen3.5-0.8B-GGUF",
    files: [
      { role: "weights", fileName: "Qwen3.5-0.8B-Q4_K_M.gguf", url: `${QWEN_REPO}/Qwen3.5-0.8B-Q4_K_M.gguf`, bytes: 532_517_120 },
      { role: "vision", fileName: "mmproj-F16.gguf", url: `${QWEN_REPO}/mmproj-F16.gguf`, bytes: 204_987_232 },
    ],
    supportsImages: true,
    chatTemplateOptions: { enable_thinking: false },
  },
} satisfies Record<string, LocalModelSpec>;

export type LocalModelId = keyof typeof LOCAL_MODELS;

export const ACTIVE_LOCAL_MODEL_ID: LocalModelId = "qwen3.5-0.8b";

export function activeLocalModel(): LocalModelSpec {
  return LOCAL_MODELS[ACTIVE_LOCAL_MODEL_ID];
}

export function totalDownloadBytes(spec: LocalModelSpec): number {
  return spec.files.reduce((sum, file) => sum + file.bytes, 0);
}

export function llamaServerCommand(spec: LocalModelSpec, modelDir: string, port: number): string {
  const weights = spec.files.find((file) => file.role === "weights");
  const vision = spec.files.find((file) => file.role === "vision");
  if (!weights) throw new Error(`${spec.id} has no weights file`);
  const visionFlag = vision ? ` --mmproj ${modelDir}/${vision.fileName}` : "";
  return `llama-server -m ${modelDir}/${weights.fileName}${visionFlag} --port ${port} -c 4096`;
}
