import * as Device from "expo-device";
import { useCallback, useEffect, useRef, useState } from "react";

import { activeLocalModel, isLocalModelId, LOCAL_MODELS } from "../../../shared/src/localModel/index.ts";
import type { LocalModelSpec } from "../../../shared/src/localModel/index.ts";
import { loadLlamaRnModel } from "./llamaRnModel";
import type { LoadedLocalModel } from "./llamaRnModel";
import { bytesStillNeeded, downloadModel, hasRoomFor, removeOtherModels } from "./modelFiles";

export type LocalModelState =
  | { phase: "missing"; bytesNeeded: number }
  | { phase: "downloading"; bytesDone: number; bytesTotal: number }
  | { phase: "loading" }
  | { phase: "ready"; usesGpu: boolean }
  | { phase: "failed"; reason: string; bytesNeeded: number }
  | { phase: "unsupported"; deviceRamBytes: number; neededRamBytes: number };

export function hubModelSpec(): LocalModelSpec {
  const requested = process.env.EXPO_PUBLIC_LOCAL_MODEL_ID;
  return requested && isLocalModelId(requested) ? LOCAL_MODELS[requested] : activeLocalModel();
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function initialState(spec: LocalModelSpec): LocalModelState {
  const deviceRamBytes = Device.totalMemory ?? 0;
  if (deviceRamBytes < spec.recommendedRamBytes) {
    return { phase: "unsupported", deviceRamBytes, neededRamBytes: spec.recommendedRamBytes };
  }
  const bytesNeeded = bytesStillNeeded(spec);
  return bytesNeeded === 0 ? { phase: "loading" } : { phase: "missing", bytesNeeded };
}

export function useLocalModel() {
  const spec = useRef(hubModelSpec()).current;
  const [state, setState] = useState<LocalModelState>(() => initialState(spec));
  const startsLoaded = useRef(state.phase === "loading").current;
  const modelRef = useRef<LoadedLocalModel | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fail = useCallback(
    (reason: string) => setState({ phase: "failed", reason, bytesNeeded: bytesStillNeeded(spec) }),
    [spec],
  );

  const load = useCallback(async () => {
    setState({ phase: "loading" });
    try {
      const model = await loadLlamaRnModel(spec);
      modelRef.current = model;
      removeOtherModels(spec);
      setState({ phase: "ready", usesGpu: model.usesGpu });
    } catch (error) {
      fail(`The model did not start: ${errorText(error)}`);
    }
  }, [spec, fail]);

  const download = useCallback(async () => {
    const bytesTotal = bytesStillNeeded(spec);
    if (!hasRoomFor(bytesTotal)) {
      fail("This phone does not have enough free storage for the model.");
      return;
    }
    const controller = new AbortController();
    abortRef.current = controller;
    setState({ phase: "downloading", bytesDone: 0, bytesTotal });
    try {
      await downloadModel(spec, (bytesDone, total) => setState({ phase: "downloading", bytesDone, bytesTotal: total }), controller.signal);
      await load();
    } catch (error) {
      if (controller.signal.aborted) setState({ phase: "missing", bytesNeeded: bytesStillNeeded(spec) });
      else fail(`The download stopped: ${errorText(error)}`);
    } finally {
      abortRef.current = null;
    }
  }, [spec, load, fail]);

  const cancelDownload = useCallback(() => abortRef.current?.abort(), []);

  const retry = useCallback(() => {
    void (bytesStillNeeded(spec) > 0 ? download() : load());
  }, [spec, download, load]);

  useEffect(() => {
    const frame = startsLoaded ? requestAnimationFrame(() => void load()) : null;
    return () => {
      if (frame !== null) cancelAnimationFrame(frame);
      abortRef.current?.abort();
      void modelRef.current?.release();
      modelRef.current = null;
    };
  }, [startsLoaded, load]);

  return { spec, state, modelRef, download, cancelDownload, retry };
}
