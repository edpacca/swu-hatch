<script lang="ts">
    import type { Player } from '../lib/player.ts';

    interface Props {
        player:    Player;
        isPlaying: boolean;
    }

    let { player, isPlaying }: Props = $props();

    const WIDTH  = 600;
    const HEIGHT = 120;
    const WAVEFORM_HEIGHT = 96;   // pixels reserved for the waveform
    const LABEL_AREA      = 24;   // pixels below for scale controls label

    // windowSize: how many analyser samples to display across the canvas.
    // Smaller = zoomed in (fewer cycles visible), larger = zoomed out.
    const MIN_WINDOW = 64;
    const MAX_WINDOW = 2048;

    let windowSize = $state(512);
    let canvas     = $state<HTMLCanvasElement | undefined>();

    $effect(() => {
        if (!canvas || !isPlaying) {
            drawIdle();
            return;
        }

        const analyser = player.analyser;
        if (!analyser) return;

        const bufferLength = analyser.fftSize; // time-domain buffer length
        const dataArray    = new Uint8Array(bufferLength);

        let rafId: number;

        function loop() {
            analyser?.getByteTimeDomainData(dataArray);
            drawWaveform(dataArray);
            rafId = requestAnimationFrame(loop);
        }

        rafId = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(rafId);
    });

    // Find the first upward zero-crossing near the centre of the buffer so the
    // waveform stays locked in place rather than drifting across the screen.
    function findTriggerOffset(data: Uint8Array): number {
        const midpoint = Math.floor(data.length / 2);
        const searchStart = Math.max(0, midpoint - windowSize);
        const searchEnd   = Math.min(data.length - 1, midpoint + windowSize);

        for (let i = searchStart; i < searchEnd - 1; i++) {
            if (data[i] < 128 && data[i + 1] >= 128) {
                return i;
            }
        }
        return searchStart; // fall back to start of search range
    }

    function drawWaveform(dataArray: Uint8Array) {
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.clearRect(0, 0, WIDTH, HEIGHT);

        const midY = WAVEFORM_HEIGHT / 2;

        // Centre line
        ctx.strokeStyle = 'rgba(150, 200, 220, 0.2)';
        ctx.lineWidth   = 1;
        ctx.beginPath();
        ctx.moveTo(0, midY);
        ctx.lineTo(WIDTH, midY);
        ctx.stroke();

        // Waveform
        const offset    = findTriggerOffset(dataArray);
        const sliceW    = WIDTH / windowSize;

        ctx.strokeStyle = 'lightblue';
        ctx.lineWidth   = 1.5;
        ctx.beginPath();

        for (let i = 0; i < windowSize; i++) {
            const sampleIndex = offset + i;
            if (sampleIndex >= dataArray.length) break;

            // dataArray values are 0–255 where 128 = silence
            const v = (dataArray[sampleIndex] - 128) / 128; // normalised -1..1
            const x = i * sliceW;
            const y = midY - v * midY;

            i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }

        ctx.stroke();

        // Scale label
        ctx.fillStyle = 'rgba(150, 200, 220, 0.6)';
        ctx.font      = '9px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`window: ${windowSize} samples`, 4, HEIGHT - 8);
    }

    function drawIdle() {
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.clearRect(0, 0, WIDTH, HEIGHT);

        const midY = WAVEFORM_HEIGHT / 2;
        ctx.strokeStyle = 'rgba(150, 200, 220, 0.2)';
        ctx.lineWidth   = 1;
        ctx.beginPath();
        ctx.moveTo(0, midY);
        ctx.lineTo(WIDTH, midY);
        ctx.stroke();
    }
</script>

<div class="oscilloscope">
    <canvas bind:this={canvas} width={WIDTH} height={HEIGHT}></canvas>
    <div class="scale-control">
        <label for="osc-scale">scale</label>
        <input
            id="osc-scale"
            type="range"
            min={MIN_WINDOW}
            max={MAX_WINDOW}
            step="32"
            bind:value={windowSize}
        />
    </div>
</div>

<style>
    .oscilloscope {
        display: flex;
        flex-direction: column;
        gap: 4px;
    }

    .scale-control {
        display: flex;
        align-items: center;
        gap: 1em;
        font: 0.8em monospace;
        color: rgba(150, 200, 220, 0.6);
    }

    .scale-control input[type="range"] {
        accent-color: lightblue;
    }
</style>
