import { freeWav, getWasmSamples } from './decode.js';

export class Player {
    #ctx = null;
    #sourceNode = null;
    #audioBuffer = null;
    #wasmPtr = null;
    #isPlaying = false;

    onPlayStateChange = null; // (isPlaying: boolean) => void

    #setPlaying(v) {
        this.#isPlaying = v;
        this.onPlayStateChange?.(v);
    }

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
        this.#setPlaying(false);
    }

    play() {
        const node = this.#ctx.createBufferSource();
        node.buffer = this.#audioBuffer;
        node.connect(this.#ctx.destination);
        node.onended = () => this.#setPlaying(false);
        this.#sourceNode = node;
        node.start(0);
        this.#setPlaying(true);
    }

    pause() {
        this.#ctx.suspend();
        this.#setPlaying(false);
    }

    resume() {
        this.#ctx.resume().then(() => this.#setPlaying(true));
    }

    toggle() {
        if (!this.#audioBuffer) return;
        if (this.#isPlaying) {
            this.pause();
        } else if (this.#ctx.state === 'suspended') {
            this.resume();
        } else {
            this.play();
        }
    }

    stop() {
        if (this.#sourceNode) {
            this.#sourceNode.stop();
            this.#sourceNode.disconnect();
            this.#sourceNode = null;
        }
        if (this.#ctx.state === 'suspended') this.#ctx.resume();
        this.#setPlaying(false);
    }

    destroy() {
        if (this.#sourceNode) this.#sourceNode.disconnect();
        if (this.#wasmPtr !== null) { freeWav(this.#wasmPtr); this.#wasmPtr = null; }
    }
}
