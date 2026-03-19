<script lang="ts">
    import type { Player } from '../lib/player.ts';

    interface Bar {
        yTop:      number;
        barHeight: number;
    }

    interface Props {
        audioBuffer: AudioBuffer | null;
        player:      Player;
        isPlaying:   boolean;
    }

    let { audioBuffer, player, isPlaying }: Props = $props();

    let canvas      = $state<HTMLCanvasElement | undefined>();
    let isScrubbing = $state(false);
    let bars: Bar[] = [];

    const WIDTH  = 600;
    const HEIGHT = 100;

    $effect(() => {
        if (!audioBuffer || !canvas) return;
        bars = computeBars(audioBuffer, WIDTH, HEIGHT);
        drawWaveform(canvas, bars, 0);
    });

    $effect(() => {
        if (!canvas || !bars.length) return;

        // Run the RAF loop when playing or scrubbing so the playhead tracks in both cases
        if (!isPlaying && !isScrubbing) {
            const progress = audioBuffer ? player.currentTime / audioBuffer.duration : 0;
            drawWaveform(canvas, bars, progress);
            return;
        }

        if (!audioBuffer) return;
        const activeCanvas = canvas;
        const activeBuffer = audioBuffer;

        let rafId: number;

        function loop() {
            const progress = player.currentTime / activeBuffer.duration;
            drawWaveform(activeCanvas, bars, Math.max(0, Math.min(1, progress)));
            rafId = requestAnimationFrame(loop);
        }

        rafId = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(rafId);
    });

    // ── Scrub pointer events ─────────────────────────────────────────────────────

    function onPointerDown(e: PointerEvent) {
        if (!canvas) return;
        canvas.setPointerCapture(e.pointerId); // keep events coming even if pointer leaves canvas
        isScrubbing = true;
        player.scrubStart(e.clientX);
    }

    function onPointerMove(e: PointerEvent) {
        if (!isScrubbing) return;
        player.scrubMove(e.clientX);
    }

    function onPointerUp(_e: PointerEvent) {
        if (!isScrubbing) return;
        isScrubbing = false;
        player.scrubEnd();
    }

    // ── Waveform drawing ─────────────────────────────────────────────────────────

    function computeBars(buffer: AudioBuffer, width: number, height: number): Bar[] {
        const data = buffer.getChannelData(0);
        const samplesPerPixel = Math.ceil(data.length / width);
        const mid = height / 2;

        return Array.from({ length: width }, (_, x) => {
            let min = 1, max = -1;
            for (let i = 0; i < samplesPerPixel; i++) {
                const s = data[x * samplesPerPixel + i] ?? 0;
                if (s < min) min = s;
                if (s > max) max = s;
            }
            return {
                yTop:      mid - max * mid,
                barHeight: Math.max(1, (mid - min * mid) - (mid - max * mid)),
            };
        });
    }

    function drawWaveform(canvas: HTMLCanvasElement, bars: Bar[], progress: number): void {
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const playheadX = Math.floor(progress * canvas.width);

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        for (let x = 0; x < bars.length; x++) {
            ctx.fillStyle = x < playheadX ? 'darkslategrey' : 'lightblue';
            ctx.fillRect(x, bars[x].yTop, 1, bars[x].barHeight);
        }
    }
</script>

<canvas
    bind:this={canvas}
    width={WIDTH}
    height={HEIGHT}
    style="cursor: {isScrubbing ? 'grabbing' : 'ew-resize'}"
    onpointerdown={onPointerDown}
    onpointermove={onPointerMove}
    onpointerup={onPointerUp}
    onpointercancel={onPointerUp}
></canvas>
