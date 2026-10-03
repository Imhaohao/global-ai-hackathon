import type { LocalModelRequest, LocalTaskName } from "./localModel.ts";

export interface ModelFile {
  role: "weights" | "vision" | "adapter";
  fileName: string;
  url: string;
  bytes: number;
  sha256: string;
}

export interface LocalModelSpec {
  id: string;
  displayName: string;
  license: string;
  sourceRepo: string;
  files: ModelFile[];
  supportsImages: boolean;
  recommendedRamBytes: number;
  chatTemplateOptions?: Record<string, string | number | boolean>;
  systemPromptOverrides?: Partial<Record<LocalTaskName, string>>;
}

export function huggingFaceFile(
  repo: string,
  role: ModelFile["role"],
  fileName: string,
  bytes: number,
  sha256: string,
): ModelFile {
  return { role, fileName, url: `https://huggingface.co/${repo}/resolve/main/${fileName}`, bytes, sha256 };
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
      huggingFaceFile(QWEN_SMALL_REPO, "weights", "Qwen3.5-0.8B-Q4_K_M.gguf", 532_517_120,
        "bd258782e35f7f458f8aced1adc053e6e92e89bc735ba3be89d38a06121dc517"),
      huggingFaceFile(QWEN_SMALL_REPO, "vision", "mmproj-F16.gguf", 204_987_232,
        "56e4c6cfe73b0c82e3e82bc518d7591997e61d81f723fc41a586f4fa69ea2453"),
    ],
    supportsImages: true,
    recommendedRamBytes: 3_000_000_000,
    chatTemplateOptions: { enable_thinking: false },
  },
  "qwen3.5-2b": {
    id: "qwen3.5-2b",
    displayName: "Qwen3.5 2B (Q4_K_M)",
    license: "Apache-2.0",
    sourceRepo: QWEN_2B_REPO,
    files: [
      huggingFaceFile(QWEN_2B_REPO, "weights", "Qwen3.5-2B-Q4_K_M.gguf", 1_280_835_840,
        "aaf42c8b7c3cab2bf3d69c355048d4a0ee9973d48f16c731c0520ee914699223"),
      huggingFaceFile(QWEN_2B_REPO, "vision", "mmproj-F16.gguf", 668_227_264,
        "7035e9cb8d7c6a9681d07eef9a364783e86ea4cd73faab2eabb4f43a101830c7"),
    ],
    supportsImages: true,
    recommendedRamBytes: 4_000_000_000,
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

export function filesNeeded(spec: LocalModelSpec, { images }: { images: boolean }): ModelFile[] {
  return spec.files.filter((file) => images || file.role !== "vision");
}

export function totalDownloadBytes(files: ModelFile[]): number {
  return files.reduce((sum, file) => sum + file.bytes, 0);
}

export function systemPromptFor(spec: LocalModelSpec, request: LocalModelRequest): string {
  return spec.systemPromptOverrides?.[request.task] ?? request.system;
}

export function llamaServerCommand(spec: LocalModelSpec, modelsRoot: string, port: number): string {
  const modelDir = `${modelsRoot}/${spec.id}`;
  const flagFor = { weights: "-m", vision: "--mmproj", adapter: "--lora" } as const;
  const fileFlags = spec.files.map((file) => `${flagFor[file.role]} ${modelDir}/${file.fileName}`);
  if (!spec.files.some((file) => file.role === "weights")) throw new Error(`${spec.id} has no weights file`);
  return `llama-server ${fileFlags.join(" ")} --port ${port} -c 4096`;
}
