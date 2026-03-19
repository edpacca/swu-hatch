interface DecodeModule {
    cwrap(name: string, returnType: string, argTypes: string[]): (...args: number[]) => number;
    _malloc(size: number): number;
    _free(ptr: number): void;
    _free_wav(ptr: number): void;
    HEAPU8: Uint8Array;
    HEAPU32: Uint32Array;
    HEAPF32: Float32Array;
}

export interface DecodeResult {
    sampleRate: number;
    frameCount: number;
    wasmPtr: number;
}

let moduleInstance: DecodeModule | null = null;

async function getModule(): Promise<DecodeModule> {
    if (!moduleInstance) {
        const { default: ModuleFactory } = await import('@wasm/decode.js');
        moduleInstance = await ModuleFactory() as DecodeModule;
    }
    return moduleInstance;
}

export async function decodeWav(file: File): Promise<DecodeResult> {
    const module = await getModule();

    const decodeWavFn = module.cwrap('decode_wav', 'number', [
        'number',  // uint8_t* data
        'number',  // size_t length
        'number',  // uint32_t* out_sample_rate
        'number',  // uint64_t* out_frame_count
    ]);

    const arrayBuffer = await file.arrayBuffer();
    const wavBytes = new Uint8Array(arrayBuffer);

    const dataPtr = module._malloc(wavBytes.length);
    module.HEAPU8.set(wavBytes, dataPtr);

    const sampleRatePtr = module._malloc(4);   // uint32_t* out_sample_rate
    const frameCountPtr = module._malloc(4);   // uint64_t* out_frame_count

    const wasmPtr = decodeWavFn(dataPtr, wavBytes.length, sampleRatePtr, frameCountPtr);

    const sampleRate = module.HEAPU32[sampleRatePtr >> 2];
    const frameCount = module.HEAPU32[frameCountPtr >> 2];

    module._free(dataPtr);
    module._free(sampleRatePtr);
    module._free(frameCountPtr);
    return { sampleRate, frameCount, wasmPtr };
}

export function freeWav(resultPtr: number): void {
    if (!moduleInstance) return;
    moduleInstance._free_wav(resultPtr);
}

export async function getWasmSamples(wasmPtr: number, frameCount: number): Promise<Float32Array> {
    const module = await getModule();
    const start = wasmPtr / 4;
    const end = start + frameCount;
    const wasmSamples = module.HEAPF32.subarray(start, end);
    return wasmSamples;
}
