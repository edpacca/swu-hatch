// AudioWorkletProcessor — runs on the audio thread.
// Loads dsp.wasm and pipes each audio block through the C++ DSP chain.

interface DspExports extends WebAssembly.Exports {
    memory: WebAssembly.Memory;
    malloc(size: number): number;
    _initialize?(): void;
    process_block(inPtr: number, outPtr: number, frames: number, channels: number): void;
    set_gain(value: number): void;
    set_cutoff(value: number): void;
}

const WASI_SHIM: WebAssembly.Imports = {
    wasi_snapshot_preview1: {
        proc_exit: (code: unknown) => { if (code !== 0) throw new Error(`WASM exit: ${code}`); },
        fd_write:  () => 0,
        fd_close:  () => 0,
        fd_seek:   () => 0,
    }
};

class DspProcessor extends AudioWorkletProcessor {
    private _wasm: DspExports | null = null;
    private _inPtr: number | null = null;
    private _outPtr: number | null = null;

    constructor() {
        super();

        this.port.onmessage = async ({ data }: MessageEvent) => {
            if (data.type === 'init') {
                const { instance } = await WebAssembly.instantiate(data.wasmBytes, WASI_SHIM);
                this._wasm = instance.exports as DspExports;
                if (this._wasm._initialize) this._wasm._initialize();
                const bufBytes = 128 * 2 * 4;
                this._inPtr  = this._wasm.malloc(bufBytes);
                this._outPtr = this._wasm.malloc(bufBytes);
                return;
            }
            if (!this._wasm) return;
            if (data.type === 'set_gain')   this._wasm.set_gain(data.value);
            if (data.type === 'set_cutoff') this._wasm.set_cutoff(data.value);
        };
    }

    process(inputs: Float32Array[][], outputs: Float32Array[][]): boolean {
        const input  = inputs[0];
        const output = outputs[0];

        // Pass through while WASM is still loading
        if (!this._wasm || !input.length) {
            for (let ch = 0; ch < output.length; ch++) {
                output[ch].set(input[ch] ?? new Float32Array(output[ch].length));
            }
            return true;
        }

        const channels   = input.length;
        const frameCount = input[0].length; // typically 128
        const inView  = new Float32Array(this._wasm.memory.buffer, this._inPtr!,  frameCount * channels);
        const outView = new Float32Array(this._wasm.memory.buffer, this._outPtr!, frameCount * channels);

        // Planar → interleaved: [L0, R0, L1, R1, ...]
        for (let f = 0; f < frameCount; f++) {
            for (let ch = 0; ch < channels; ch++) {
                inView[f * channels + ch] = input[ch][f];
            }
        }

        this._wasm.process_block(this._inPtr!, this._outPtr!, frameCount, channels);

        // Interleaved → planar
        for (let f = 0; f < frameCount; f++) {
            for (let ch = 0; ch < channels; ch++) {
                output[ch][f] = outView[f * channels + ch];
            }
        }

        return true;
    }
}

registerProcessor('dsp-processor', DspProcessor);
