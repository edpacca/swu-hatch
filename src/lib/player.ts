import { freeWav, getWasmSamples } from './decode.js';
import type { DecodeResult } from './decode.js';
import dspWasmUrl from '@wasm/dsp.wasm?url';

export class Player {
    #ctx:           AudioContext      | null = null;
    #analyser:      AnalyserNode      | null = null;
    #workletNode:   AudioWorkletNode  | null = null;  // DSP (WASM effects)
    #playbackNode:  AudioWorkletNode  | null = null;  // audio source
    #audioBuffer:   AudioBuffer       | null = null;
    #wasmPtr:       number            | null = null;

    #isPlaying:     boolean = false;
    #bypass:        boolean = false;
    #currentSample: number  = 0;
    #frameCount:    number  = 0;
    #sampleRate:    number  = 0;
    #lastManualRate: number = 1.0;  // restored after scrub ends

    // Scrub displacement tracking
    #scrubActive: boolean = false;
    #scrubStartX: number  = 0;   // pointer X at the moment scrubbing began

    // Pixels of displacement that map to a 1× playback rate.
    // Smaller = more sensitive; 100 means ±100 px = ±1× speed.
    static readonly #PIXELS_PER_UNIT = 100;

    onPlayStateChange: ((isPlaying: boolean) => void) | null = null;
    onBufferLoaded:    ((audioBuffer: AudioBuffer) => void) | null = null;

    get currentTime(): number {
        return this.#sampleRate > 0 ? this.#currentSample / this.#sampleRate : 0;
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

        // Register both worklet processors before creating any nodes
        await this.#ctx.audioWorklet.addModule(
            new URL('./playback-processor.ts', import.meta.url)
        );
        await this.#ctx.audioWorklet.addModule(
            new URL('./dsp-processor.ts', import.meta.url)
        );

        // Playback node — generates audio, no inputs
        this.#playbackNode = new AudioWorkletNode(this.#ctx, 'playback-processor', {
            numberOfInputs:     0,
            numberOfOutputs:    1,
            outputChannelCount: [2],
        });

        // DSP node — applies WASM effects
        const wasmBytes = await fetch(dspWasmUrl).then(r => r.arrayBuffer());
        this.#workletNode = new AudioWorkletNode(this.#ctx, 'dsp-processor', {
            numberOfInputs:     1,
            numberOfOutputs:    1,
            outputChannelCount: [2],
        });
        this.#workletNode.port.postMessage({ type: 'init', wasmBytes }, [wasmBytes]);

        // Graph: playbackNode → dspWorklet → analyser → destination
        this.#playbackNode.connect(this.#workletNode);
        this.#workletNode.connect(this.#analyser);

        // Handle position and track-end notifications from the playback worklet
        this.#playbackNode.port.onmessage = ({ data }: MessageEvent) => {
            if (data.type === 'position') {
                this.#currentSample = data.sample as number;
            }
            if (data.type === 'ended') {
                this.#currentSample = 0;
                this.#setPlaying(false);
            }
        };
    }

    async loadBuffer({ sampleRate, frameCount, wasmPtr }: DecodeResult): Promise<void> {
        if (this.#wasmPtr !== null) { freeWav(this.#wasmPtr); this.#wasmPtr = null; }

        this.#wasmPtr    = wasmPtr;
        this.#frameCount = frameCount;
        this.#sampleRate = sampleRate;
        this.#currentSample = 0;

        const wasmSamples = await getWasmSamples(wasmPtr, frameCount * 2);

        // Deinterleave into planar channels
        const leftChannel  = new Float32Array(frameCount);
        const rightChannel = new Float32Array(frameCount);
        for (let i = 0; i < frameCount; i++) {
            leftChannel[i]  = wasmSamples[i * 2];
            rightChannel[i] = wasmSamples[i * 2 + 1];
        }

        // Build the AudioBuffer for Waveform visualisation (copyToChannel reads the
        // arrays without consuming them, so they remain valid for the transfer below)
        const buffer = this.#ctx!.createBuffer(2, frameCount, sampleRate);
        buffer.copyToChannel(leftChannel,  0);
        buffer.copyToChannel(rightChannel, 1);
        this.#audioBuffer = buffer;

        // Transfer the raw PCM to the playback worklet (zero-copy).
        // leftChannel / rightChannel are detached after this call.
        this.#playbackNode!.port.postMessage(
            { type: 'load', channels: [leftChannel.buffer, rightChannel.buffer], frameCount },
            [leftChannel.buffer, rightChannel.buffer]
        );

        this.onBufferLoaded?.(buffer);
        this.#setPlaying(false);
    }

    // ── Playback controls ────────────────────────────────────────────────────────

    play(): void {
        this.#playbackNode!.port.postMessage({ type: 'play', position: this.#currentSample });
        this.#setPlaying(true);
    }

    pause(): void {
        // Pause via worklet message — the AudioContext stays running so the
        // analyser and oscilloscope remain alive.
        this.#playbackNode!.port.postMessage({ type: 'pause' });
        this.#setPlaying(false);
    }

    resume(): void {
        this.#playbackNode!.port.postMessage({ type: 'play', position: this.#currentSample });
        this.#setPlaying(true);
    }

    stop(): void {
        this.#playbackNode!.port.postMessage({ type: 'stop' });
        this.#currentSample = 0;
        this.#setPlaying(false);
    }

    async toggle(): Promise<void> {
        if (!this.#frameCount) return;
        if (this.#ctx!.state === 'suspended') await this.#ctx!.resume();
        if (this.#isPlaying) this.pause();
        else this.resume();
    }

    // ── DSP controls ─────────────────────────────────────────────────────────────

    setGain(value: number): void {
        this.#workletNode?.port.postMessage({ type: 'set_gain', value });
    }

    setCutoff(value: number): void {
        this.#workletNode?.port.postMessage({ type: 'set_cutoff', value });
    }

    setRate(value: number): void {
        this.#lastManualRate = value;
        this.#playbackNode?.port.postMessage({ type: 'set_rate', rate: value });
    }

    setBypass(bypassed: boolean): void {
        this.#bypass = bypassed;
        if (!this.#playbackNode) return;

        if (bypassed) {
            this.#playbackNode.disconnect(this.#workletNode!);
            this.#playbackNode.connect(this.#analyser!);
        } else {
            this.#playbackNode.disconnect(this.#analyser!);
            this.#playbackNode.connect(this.#workletNode!);
        }
    }

    // ── Scrub API ────────────────────────────────────────────────────────────────

    scrubStart(initialX: number): void {
        this.#scrubActive = true;
        this.#scrubStartX = initialX;
        // Begin at rate 0 — pointer at the click point means frozen
        this.#playbackNode?.port.postMessage({ type: 'scrub', rate: 0 });
        if (!this.#isPlaying) {
            this.#playbackNode?.port.postMessage({ type: 'play', position: this.#currentSample });
        }
    }

    scrubMove(pointerX: number): void {
        if (!this.#scrubActive) return;

        // Displacement from the click origin determines rate.
        // Holding the pointer still = rate 0 (frozen).
        // Moving ±PIXELS_PER_UNIT pixels = ±1× speed.
        const displacement = pointerX - this.#scrubStartX;
        const rate = displacement / Player.#PIXELS_PER_UNIT;
        this.#playbackNode?.port.postMessage({ type: 'scrub', rate: Math.max(-8, Math.min(8, rate)) });
    }

    scrubEnd(): void {
        this.#scrubActive = false;

        if (this.#isPlaying) {
            // Resume normal playback at the user's last manual rate from current position
            this.#playbackNode?.port.postMessage({ type: 'set_rate', rate: this.#lastManualRate });
            this.#playbackNode?.port.postMessage({ type: 'play', position: this.#currentSample });
        } else {
            // Was paused before scrub — silence the output again
            this.#playbackNode?.port.postMessage({ type: 'pause' });
        }
    }

    // ── Lifecycle ────────────────────────────────────────────────────────────────

    destroy(): void {
        this.#playbackNode?.disconnect();
        if (this.#wasmPtr !== null) { freeWav(this.#wasmPtr); this.#wasmPtr = null; }
    }
}
