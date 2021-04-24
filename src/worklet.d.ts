
declare module "soundtouchjs"
declare module "pitchy"

interface AudioWorkletProcessor {
  readonly port: MessagePort;
  process(
    inputs: Float32Array[][],
    outputs: Float32Array[][],
    parameters: Record<string, Float32Array>
  ): boolean
}

declare var AudioWorkletProcessor: {
  prototype: AudioWorkletProcessor
  new (options?: AudioWorkletNodeOptions): AudioWorkletProcessor
};


declare function registerProcessor(
  name: string,
  processorCtor: (new (
    options?: AudioWorkletNodeOptions
  ) => AudioWorkletProcessor) & {
    parameterDescriptors?: AudioParamDescriptor[]
  }
): void

interface GlobalVar {
}

declare var gvar: GlobalVar