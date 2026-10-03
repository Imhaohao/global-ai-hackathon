export type JsonSchema = Record<string, unknown>;

export type LocalTaskName = "parseFarmerMessage" | "readProductLabel" | "phraseVerdict";

export interface LocalModelRequest {
  task: LocalTaskName;
  system: string;
  prompt: string;
  imageJpegBase64?: string;
  outputSchema?: JsonSchema;
  maxTokens: number;
}

export interface LocalModel {
  readonly modelId: string;
  complete(request: LocalModelRequest): Promise<string>;
}

export type TaskResult<T> = { status: "ok"; value: T } | { status: "unsure"; reason: string };

export function unsure(reason: string): { status: "unsure"; reason: string } {
  return { status: "unsure", reason };
}

export async function completeJson(model: LocalModel, request: LocalModelRequest): Promise<TaskResult<unknown>> {
  let raw: string;
  try {
    raw = await model.complete(request);
  } catch (error) {
    return unsure(`model failed: ${error instanceof Error ? error.message : String(error)}`);
  }
  const json = firstJsonObject(raw);
  if (json === null) return unsure("model did not return JSON");
  try {
    return { status: "ok", value: JSON.parse(json) };
  } catch {
    return unsure("model did not return JSON");
  }
}

export function firstJsonObject(raw: string): string | null {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  return start >= 0 && end > start ? raw.slice(start, end + 1) : null;
}

export function isOneOf<T extends string>(value: unknown, options: readonly T[]): value is T {
  return typeof value === "string" && (options as readonly string[]).includes(value);
}

export function isNullableString(value: unknown, maxLength: number): value is string | null {
  return value === null || (typeof value === "string" && value.length <= maxLength);
}
