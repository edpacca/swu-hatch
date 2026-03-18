<script>
    let { audioBuffer, player, isPlaying } = $props();

    let canvas = $state();
    let bars = [];

    const WIDTH  = 600;
    const HEIGHT = 100;

    $effect(() => {
        if (!audioBuffer || !canvas) return;
        bars = computeBars(audioBuffer, WIDTH, HEIGHT);
        drawWaveform(canvas, bars, 0);
    });

    $effect(() => {
        if (!canvas || !bars.length) return;

        if (!isPlaying) {
            const progress = audioBuffer ? player.currentTime / audioBuffer.duration : 0;
            drawWaveform(canvas, bars, progress);
            return;
        }

        let rafId;

        function loop() {
            const progress = player.currentTime / audioBuffer.duration;
            drawWaveform(canvas, bars, progress);
            rafId = requestAnimationFrame(loop);
        }

        rafId = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(rafId);
    });

    function computeBars(buffer, width, height) {
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

    function drawWaveform(canvas, bars, progress) {
        const ctx = canvas.getContext('2d');
        const playheadX = Math.floor(progress * canvas.width);

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        for (let x = 0; x < bars.length; x++) {
            ctx.fillStyle = x < playheadX ? 'darkslategrey' : 'lightblue';
            ctx.fillRect(x, bars[x].yTop, 1, bars[x].barHeight);
        }
    }
</script>

<canvas bind:this={canvas} width={WIDTH} height={HEIGHT}></canvas>
