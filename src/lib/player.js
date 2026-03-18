import { freeWav, getWasmSamples } from './decode.js';

export class Player {
    #ctx = null;
    #analyser = null;
    #sourceNode = null;
    #audioBuffer = null;
    #wasmPtr = null;
    #isPlaying = false;
    #startTime = 0;

    onPlayStateChange = null; // (isPlaying: boolean) => void
    onBufferLoaded    = null; // (audioBuffer: AudioBuffer) => void

    get currentTime() {
        if (this.#isPlaying) return this.#ctx.currentTime - this.#startTime;
        if (this.#ctx?.state === 'suspended') return this.#ctx.currentTime - this.#startTime;
        return 0;
    }

    get audioBuffer() {
        return this.#audioBuffer;
    }

    get analyser() {
        return this.#analyser;
    }

    #setPlaying(v) {
        this.#isPlaying = v;
        this.onPlayStateChange?.(v);
    }

    setupContext() {
        if (this.#ctx && this.#ctx.state !== 'closed') return;
        this.#ctx = new AudioContext();
        this.#analyser = this.#ctx.createAnalyser();
        this.#analyser.fftSize = 2048;
        this.#analyser.smoothingTimeConstant = 0.8;
        this.#analyser.connect(this.#ctx.destination);
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
        this.onBufferLoaded?.(buffer);
        this.#setPlaying(false);
    }

    play() {
        const node = this.#ctx.createBufferSource();
        node.buffer = this.#audioBuffer;
        node.connect(this.#analyser);
        node.onended = () => this.#setPlaying(false);
        this.#sourceNode = node;
        this.#startTime = this.#ctx.currentTime;
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
