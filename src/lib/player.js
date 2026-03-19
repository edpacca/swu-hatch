import { freeWav, getWasmSamples } from './decode.js';
import dspWasmUrl from '@wasm/dsp.wasm?url';

export class Player {
    #ctx = null;
    #analyser = null;
    #workletNode = null;
    #sourceNode = null;
    #audioBuffer = null;
    #wasmPtr = null;
    #isPlaying = false;
    #startTime = 0;
    #bypass = false;

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

    async setupContext() {
        if (this.#ctx && this.#ctx.state !== 'closed') return;
        this.#ctx = new AudioContext();

        this.#analyser = this.#ctx.createAnalyser();
        this.#analyser.fftSize = 2048;
        this.#analyser.smoothingTimeConstant = 0.8;
        this.#analyser.connect(this.#ctx.destination);

        await this.#ctx.audioWorklet.addModule(
            new URL('./dsp-processor.js', import.meta.url)
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

    async loadBuffer({ sampleRate, frameCount, wasmPtr }) {
        if (this.#sourceNode) this.#sourceNode.disconnect();
        if (this.#wasmPtr !== null) { freeWav(this.#wasmPtr); this.#wasmPtr = null; }

        this.#wasmPtr = wasmPtr;

        const buffer = this.#ctx.createBuffer(2, frameCount, sampleRate);
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

    play() {
        const node = this.#ctx.createBufferSource();
        node.buffer = this.#audioBuffer;
        node.onended = () => this.#setPlaying(false);

        node.connect(this.#bypass ? this.#analyser : this.#workletNode);

        this.#sourceNode = node;
        this.#startTime  = this.#ctx.currentTime;
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

    setGain(value) {
        this.#workletNode?.port.postMessage({ type: 'set_gain', value });
    }

    setCutoff(value) {
        this.#workletNode?.port.postMessage({ type: 'set_cutoff', value });
    }

    // Bypass routes audio directly to the analyser, skipping the WASM DSP.
    // If audio is currently playing, rewires the source node immediately.
    setBypass(bypassed) {
        this.#bypass = bypassed;
        if (!this.#sourceNode) return;

        if (bypassed) {
            this.#sourceNode.disconnect(this.#workletNode);
            this.#sourceNode.connect(this.#analyser);
        } else {
            this.#sourceNode.disconnect(this.#analyser);
            this.#sourceNode.connect(this.#workletNode);
        }
    }

    destroy() {
        if (this.#sourceNode) this.#sourceNode.disconnect();
        if (this.#wasmPtr !== null) { freeWav(this.#wasmPtr); this.#wasmPtr = null; }
    }
}
