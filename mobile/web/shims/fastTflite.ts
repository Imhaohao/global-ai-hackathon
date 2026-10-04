// Browser stand-in for react-native-fast-tflite. It runs the same bundled .tflite file with
// Google's LiteRT.js WebAssembly runtime, so the web demo classifies leaves with the real model.
import { loadAndCompile, loadLiteRt, Tensor, type CompiledModel, type TensorDetails } from '@litertjs/core';
import { Asset } from 'expo-asset';

const LITERT_WASM_URL = 'https://cdn.jsdelivr.net/npm/@litertjs/core@2.5.3/wasm/';

let runtimeReady: Promise<unknown> | undefined;

type TensorInfo = { name: string; dataType: string; shape: number[] };

export type TfliteModel = {
  inputs: TensorInfo[];
  outputs: TensorInfo[];
  run(inputs: ArrayBuffer[]): Promise<ArrayBuffer[]>;
  dispose(): void;
};

function describe(details: readonly TensorDetails[]): TensorInfo[] {
  return details.map((tensor) => ({ name: tensor.name, dataType: tensor.dtype, shape: [...tensor.shape] }));
}

async function modelUrl(asset: number | string): Promise<string> {
  if (typeof asset === 'string') return asset;
  const resolved = Asset.fromModule(asset);
  return resolved.uri;
}

function wrap(model: CompiledModel): TfliteModel {
  const inputs = describe(model.getInputDetails());
  const inputShape = inputs[0].shape;
  return {
    inputs,
    outputs: describe(model.getOutputDetails()),
    dispose: () => model.delete(),
    async run([input]) {
      const tensor = new Tensor(new Float32Array(input), inputShape);
      try {
        const [output] = await model.run([tensor]);
        try {
          const onCpu = await output.moveTo('wasm');
          try {
            return [Float32Array.from(onCpu.toTypedArray() as Float32Array).buffer];
          } finally {
            onCpu.delete();
          }
        } finally {
          output.delete();
        }
      } finally {
        tensor.delete();
      }
    },
  };
}

export async function loadTensorflowModel(asset: number | string): Promise<TfliteModel> {
  runtimeReady ??= loadLiteRt(LITERT_WASM_URL, { jspi: false, threads: false });
  await runtimeReady;
  const model = await loadAndCompile(await modelUrl(asset), { accelerator: 'wasm' });
  return wrap(model);
}
