import { freeWav, getWasmSamples } from './decode.js';

export class Player {
    #ctx = null;
    #sourceNode = null;
    #audioBuffer = null;
    #wasmPtr = null;

    onPlayStateChange = null; // (isPlaying: boolean) => void

    setupContext() {
        if (this.#ctx && this.#ctx.state !== 'closed') return;
        this.#ctx = new AudioContext();
    }

    async loadBuffer({ sampleRate, frameCount, wasmPtr }) {
        if (this.#sourceNode) this.#sourceNode.disconnect();
        if (this.#wasmPtr !== null) { freeWav(this.#wasmPtr); this.#wasmPtr = null; }

        this.#wasmPtr = wasmPtr;

        const buffer = this.#ctx.createBuffer(2, frameCount, sampleRate);
        const wasmSamples = await getWasmSamples(wasmPtr, frameCount * 2);

        const leftChannel = new Float32Array(frameCount);
        const rightChannel = new Float32Array(frameCount);
        for (let i = 0; i < frameCount; i++) {
            leftChannel[i] = wasmSamples[i * 2];
            rightChannel[i] = wasmSamples[i * 2 + 1];
        }
        buffer.copyToChannel(leftChannel, 0);
        buffer.copyToChannel(rightChannel, 1);
        this.#audioBuffer = buffer;
        this.onPlayStateChange?.(false);
    }

    play() {
        if (!this.#audioBuffer) return;
        const node = this.#ctx.createBufferSource();
        node.buffer = this.#audioBuffer;
        node.connect(this.#ctx.destination);
        node.onended = () => this.onPlayStateChange?.(false);
        this.#sourceNode = node;
        if (this.#ctx.state === 'suspended') {
            this.#ctx.resume().then(() => { node.start(0); this.onPlayStateChange?.(true); });
        } else {
            node.start(0);
            this.onPlayStateChange?.(true);
        }
    }

    pause() {
        this.#ctx.suspend();
        this.onPlayStateChange?.(false);
    }

    resume() {
        if (this.#ctx.state === 'suspended') this.#ctx.resume();
    }

    destroy() {
        if (this.#sourceNode) this.#sourceNode.disconnect();
        if (this.#wasmPtr !== null) { freeWav(this.#wasmPtr); this.#wasmPtr = null; }
    }
}
