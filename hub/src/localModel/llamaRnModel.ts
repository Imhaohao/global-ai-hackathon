import { initLlama } from "llama.rn";
import type { CompletionResponseFormat, LlamaContext } from "llama.rn";

import { systemPromptFor } from "../../../shared/src/localModel/index.ts";
import type { LocalModel, LocalModelRequest, LocalModelSpec } from "../../../shared/src/localModel/index.ts";
import { hubFiles, localFile } from "./modelFiles";

const CONTEXT_TOKENS = 2048;
const ALL_LAYERS_ON_GPU = 99;

export interface LoadedLocalModel extends LocalModel {
  usesGpu: boolean;
  release(): Promise<void>;
}

function fileUris(spec: LocalModelSpec) {
  const files = hubFiles(spec);
  const weights = files.find((file) => file.role === "weights");
  if (!weights) throw new Error(`${spec.displayName} has no weights file`);
  const adapters = files.filter((file) => file.role === "adapter");
  return {
    weights: localFile(spec, weights).uri,
    adapters: adapters.map((adapter) => ({ path: localFile(spec, adapter).uri })),
  };
}

async function createContext(spec: LocalModelSpec): Promise<LlamaContext> {
  const { weights, adapters } = fileUris(spec);
  const base = { model: weights, n_ctx: CONTEXT_TOKENS, lora_list: adapters.length ? adapters : undefined };
  try {
    return await initLlama({ ...base, n_gpu_layers: ALL_LAYERS_ON_GPU });
  } catch {
    return initLlama({ ...base, n_gpu_layers: 0 });
  }
}

function responseFormat(request: LocalModelRequest): CompletionResponseFormat | undefined {
  if (!request.outputSchema) return undefined;
  return { type: "json_schema", json_schema: { strict: true, schema: request.outputSchema } };
}

export async function loadLlamaRnModel(spec: LocalModelSpec): Promise<LoadedLocalModel> {
  const context = await createContext(spec);
  const thinkingOff = spec.chatTemplateOptions?.enable_thinking === false;
  return {
    modelId: spec.id,
    usesGpu: context.gpu,
    async complete(request) {
      if (request.imageJpegBase64) throw new Error("The hub loads models without image support");
      const result = await context.completion({
        messages: [
          { role: "system", content: systemPromptFor(spec, request) },
          { role: "user", content: request.prompt },
        ],
        n_predict: request.maxTokens,
        temperature: 0,
        enable_thinking: thinkingOff ? false : undefined,
        chat_template_kwargs: spec.chatTemplateOptions,
        response_format: responseFormat(request),
      });
      return result.content || result.text;
    },
    release: () => context.release(),
  };
}
