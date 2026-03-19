import { freeWav, getWasmSamples } from './decode.js';
import type { DecodeResult } from './decode.js';
import dspWasmUrl from '@wasm/dsp.wasm?url';

export class Player {
    #ctx: AudioContext | null = null;
    #analyser: AnalyserNode | null = null;
    #workletNode: AudioWorkletNode | null = null;
    #sourceNode: AudioBufferSourceNode | null = null;
    #audioBuffer: AudioBuffer | null = null;
    #wasmPtr: number | null = null;
    #isPlaying: boolean = false;
    #startTime: number = 0;
    #bypass: boolean = false;

    onPlayStateChange: ((isPlaying: boolean) => void) | null = null;
    onBufferLoaded: ((audioBuffer: AudioBuffer) => void) | null = null;

    get currentTime(): number {
        if (this.#isPlaying) return this.#ctx!.currentTime - this.#startTime;
        if (this.#ctx?.state === 'suspended') return this.#ctx.currentTime - this.#startTime;
        return 0;
    }

    get audioBuffer(): AudioBuffer | null {
        return this.#audioBuffer;
    }

    get analyser(): AnalyserNode | null {
        return this.#analyser;
    }

    #setPlaying(v: boolean): void {
        this.#isPlaying = v;
        this.onPlayStateChange?.(v);
    }

    async setupContext(): Promise<void> {
        if (this.#ctx && this.#ctx.state !== 'closed') return;
        this.#ctx = new AudioContext();

        this.#analyser = this.#ctx.createAnalyser();
        this.#analyser.fftSize = 2048;
        this.#analyser.smoothingTimeConstant = 0.8;
        this.#analyser.connect(this.#ctx.destination);

        await this.#ctx.audioWorklet.addModule(
            new URL('./dsp-processor.ts', import.meta.url)
        );

        const wasmBytes = await fetch(dspWasmUrl).then(r => r.arrayBuffer());

        this.#workletNode = new AudioWorkletNode(this.#ctx, 'dsp-processor', {
            numberOfInputs:     1,
            numberOfOutputs:    1,
            outputChannelCount: [2],
        });
        this.#workletNode.connect(this.#analyser);

        // Transfer bytes (zero-copy) — worklet instantiates WASM from these
        this.#workletNode.port.postMessage({ type: 'init', wasmBytes }, [wasmBytes]);
    }

    async loadBuffer({ sampleRate, frameCount, wasmPtr }: DecodeResult): Promise<void> {
        if (this.#sourceNode) this.#sourceNode.disconnect();
        if (this.#wasmPtr !== null) { freeWav(this.#wasmPtr); this.#wasmPtr = null; }

        this.#wasmPtr = wasmPtr;

        const buffer = this.#ctx!.createBuffer(2, frameCount, sampleRate);
        const wasmSamples = await getWasmSamples(wasmPtr, frameCount * 2);

        const leftChannel  = new Float32Array(frameCount);
        const rightChannel = new Float32Array(frameCount);
        for (let i = 0; i < frameCount; i++) {
            leftChannel[i]  = wasmSamples[i * 2];
            rightChannel[i] = wasmSamples[i * 2 + 1];
        }
        buffer.copyToChannel(leftChannel, 0);
        buffer.copyToChannel(rightChannel, 1);

        this.#audioBuffer = buffer;
        this.onBufferLoaded?.(buffer);
        this.#setPlaying(false);
    }

    play(): void {
        const node = this.#ctx!.createBufferSource();
        node.buffer = this.#audioBuffer;
        node.onended = () => this.#setPlaying(false);

        node.connect(this.#bypass ? this.#analyser! : this.#workletNode!);

        this.#sourceNode = node;
        this.#startTime  = this.#ctx!.currentTime;
        node.start(0);
        this.#setPlaying(true);
    }

    pause(): void {
        this.#ctx!.suspend();
        this.#setPlaying(false);
    }

    resume(): void {
        this.#ctx!.resume().then(() => this.#setPlaying(true));
    }

    toggle(): void {
        if (!this.#audioBuffer) return;
        if (this.#isPlaying) {
            this.pause();
        } else if (this.#ctx!.state === 'suspended') {
            this.resume();
        } else {
            this.play();
        }
    }

    stop(): void {
        if (this.#sourceNode) {
            this.#sourceNode.stop();
            this.#sourceNode.disconnect();
            this.#sourceNode = null;
        }
        if (this.#ctx!.state === 'suspended') this.#ctx!.resume();
        this.#setPlaying(false);
    }

    setGain(value: number): void {
        this.#workletNode?.port.postMessage({ type: 'set_gain', value });
    }

    setCutoff(value: number): void {
        this.#workletNode?.port.postMessage({ type: 'set_cutoff', value });
    }

    // Bypass routes audio directly to the analyser, skipping the WASM DSP.
    // If audio is currently playing, rewires the source node immediately.
    setBypass(bypassed: boolean): void {
        this.#bypass = bypassed;
        if (!this.#sourceNode) return;

        if (bypassed) {
            this.#sourceNode.disconnect(this.#workletNode!);
            this.#sourceNode.connect(this.#analyser!);
        } else {
            this.#sourceNode.disconnect(this.#analyser!);
            this.#sourceNode.connect(this.#workletNode!);
        }
    }

    destroy(): void {
        if (this.#sourceNode) this.#sourceNode.disconnect();
        if (this.#wasmPtr !== null) { freeWav(this.#wasmPtr); this.#wasmPtr = null; }
    }
}
