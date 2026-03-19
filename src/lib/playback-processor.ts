// AudioWorkletProcessor — audio source with variable-rate bidirectional playback.
// Replaces AudioBufferSourceNode so that negative rates (backwards playback) are
// possible. The main thread transfers planar PCM Float32Arrays to this worklet and
// drives position via message commands.

class PlaybackProcessor extends AudioWorkletProcessor {
    private channels: Float32Array[] = [];  // [left, right], received via transfer
    private frameCount: number = 0;
    private position: number = 0;           // current read head (float sample index)
    private rate: number = 1.0;             // samples/sample; negative = backwards
    private isPlaying: boolean = false;
    private quantaCount: number = 0;        // throttle position reports

    constructor() {
        super();

        this.port.onmessage = ({ data }: MessageEvent) => {
            switch (data.type) {
                case 'load': {
                    // Buffers arrive as transferred ArrayBuffers — reconstruct views
                    this.channels   = (data.channels as ArrayBuffer[]).map(b => new Float32Array(b));
                    this.frameCount = data.frameCount as number;
                    this.position   = 0;
                    this.isPlaying  = false;
                    break;
                }
                case 'play': {
                    if (data.position !== undefined) {
                        this.position = data.position as number;
                    }
                    this.isPlaying = true;
                    break;
                }
                case 'pause': {
                    this.isPlaying = false;
                    break;
                }
                case 'stop': {
                    this.isPlaying = false;
                    this.position  = 0;
                    break;
                }
                case 'seek': {
                    // Normalised 0–1
                    this.position = (data.position as number) * this.frameCount;
                    break;
                }
                case 'set_rate':
                case 'scrub': {
                    this.rate = Math.max(-16, Math.min(16, data.rate ?? data.value ?? 1));
                    break;
                }
            }
        };
    }

    process(_inputs: Float32Array[][], outputs: Float32Array[][]): boolean {
        const output = outputs[0];
        if (!output) return true;

        const channelCount = output.length;
        const frameCount   = output[0]?.length ?? 128;

        // Output silence and keep alive if no data has been loaded yet
        if (!this.channels.length || this.frameCount === 0) {
            for (let ch = 0; ch < channelCount; ch++) output[ch].fill(0);
            return true;
        }

        for (let i = 0; i < frameCount; i++) {
            if (!this.isPlaying) {
                for (let ch = 0; ch < channelCount; ch++) output[ch][i] = 0;
                continue;
            }

            const lo = Math.floor(this.position);
            const hi = Math.min(lo + 1, this.frameCount - 1); // clamp at last sample
            const t  = this.position - lo;                    // interpolation fraction [0,1)

            for (let ch = 0; ch < channelCount; ch++) {
                const src = this.channels[ch % this.channels.length];
                output[ch][i] = src[lo] * (1 - t) + src[hi] * t;
            }

            this.position += this.rate;

            if (this.position >= this.frameCount) {
                this.position  = this.frameCount - 1;
                this.isPlaying = false;
                this.port.postMessage({ type: 'ended' });
                // Zero remaining frames
                for (let j = i + 1; j < frameCount; j++) {
                    for (let ch = 0; ch < channelCount; ch++) output[ch][j] = 0;
                }
                break;
            }

            if (this.position < 0) {
                this.position  = 0;
                this.isPlaying = false;
                this.port.postMessage({ type: 'ended' });
                for (let j = i + 1; j < frameCount; j++) {
                    for (let ch = 0; ch < channelCount; ch++) output[ch][j] = 0;
                }
                break;
            }
        }

        // Throttled position reporting — every 8 render quanta (~1.5 ms at 44100 Hz)
        this.quantaCount++;
        if (this.quantaCount >= 8) {
            this.port.postMessage({ type: 'position', sample: this.position });
            this.quantaCount = 0;
        }

        return true;
    }
}

registerProcessor('playback-processor', PlaybackProcessor);
