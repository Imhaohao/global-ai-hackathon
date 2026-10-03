import type { LocalModel, LocalModelRequest } from "./localModel.ts";
import type { LocalModelSpec } from "./modelCatalog.ts";

type Fetch = typeof fetch;

function userContent(request: LocalModelRequest): unknown {
  if (!request.imageJpegBase64) return request.prompt;
  return [
    { type: "image_url", image_url: { url: `data:image/jpeg;base64,${request.imageJpegBase64}` } },
    { type: "text", text: request.prompt },
  ];
}

export function buildChatBody(spec: LocalModelSpec, request: LocalModelRequest): Record<string, unknown> {
  return {
    messages: [
      { role: "system", content: request.system },
      { role: "user", content: userContent(request) },
    ],
    max_tokens: request.maxTokens,
    temperature: 0,
    ...(spec.chatTemplateOptions ? { chat_template_kwargs: spec.chatTemplateOptions } : {}),
    ...(request.outputSchema
      ? { response_format: { type: "json_schema", json_schema: { name: "output", schema: request.outputSchema } } }
      : {}),
  };
}

function messageText(payload: unknown): string {
  const content = (payload as { choices?: { message?: { content?: unknown } }[] }).choices?.[0]?.message?.content;
  if (typeof content !== "string") throw new Error("llama-server response had no message text");
  return content;
}

export function createLlamaServerModel(spec: LocalModelSpec, baseUrl: string, fetchImpl: Fetch = fetch): LocalModel {
  return {
    modelId: spec.id,
    async complete(request) {
      if (request.imageJpegBase64 && !spec.supportsImages) throw new Error(`${spec.id} cannot read images`);
      const response = await fetchImpl(`${baseUrl}/v1/chat/completions`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(buildChatBody(spec, request)),
      });
      if (!response.ok) throw new Error(`llama-server returned ${response.status}`);
      return messageText(await response.json());
    },
  };
}
