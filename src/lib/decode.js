let moduleInstance = null;

async function getModule() {
    if (!moduleInstance) {
        const { default: ModuleFactory } = await import('@wasm/main.js');
        moduleInstance = await ModuleFactory();
    }
    return moduleInstance;
}

export async function decodeWav(file) {
    const module = await getModule();

    const decodeWav = module.cwrap('decode_wav', 'number', [
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

    const wasmPtr = decodeWav(dataPtr, wavBytes.length, sampleRatePtr, frameCountPtr);

    const sampleRate = module.HEAPU32[sampleRatePtr >> 2];
    const frameCount = module.HEAPU32[frameCountPtr >> 2];

    module._free(dataPtr);
    module._free(sampleRatePtr);
    module._free(frameCountPtr);
    return { sampleRate, frameCount, wasmPtr };
}

export function freeWav(resultPtr) {
    if (!moduleInstance) return;
    moduleInstance._free_wav(resultPtr);
}

export async function getWasmSamples (wasmPtr, frameCount) {
    const module = await getModule();
    const start = wasmPtr / 4;
    const end = start + frameCount;
    const wasmSamples = module.HEAPF32.subarray(start, end);
    return wasmSamples;
}
