<script>
    let { player, isPlaying } = $props();

    const WIDTH        = 600;
    const BAR_AREA     = 80;
    const LABEL_AREA   = 16;
    const HEIGHT       = BAR_AREA + LABEL_AREA;
    const BAR_COUNT    = 64;
    const BAR_WIDTH    = Math.floor(WIDTH / BAR_COUNT);
    const BAR_GAP      = 1;

    const SCALE_LABELS = [
        { freq: 100,   label: '100' },
        { freq: 1000,  label: '1k'  },
        { freq: 2000,  label: '2k'  },
        { freq: 5000,  label: '5k'  },
        { freq: 10000, label: '10k' },
        { freq: 20000, label: '20k' },
    ];

    let canvas = $state();

    $effect(() => {
        if (!canvas || !isPlaying) {
            drawIdle();
            return;
        }

        const analyser   = player.analyser;
        const sampleRate = analyser.context.sampleRate;
        const binCount   = analyser.frequencyBinCount; // 1024
        const dataArray  = new Uint8Array(binCount);
        const binsPerBar = Math.floor(binCount / BAR_COUNT);

        let rafId;

        function loop() {
            analyser.getByteFrequencyData(dataArray);
            drawBars(dataArray, binsPerBar);
            drawScale(sampleRate);
            rafId = requestAnimationFrame(loop);
        }

        rafId = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(rafId);
    });

    function drawIdle() {
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, WIDTH, HEIGHT);

        if (player.analyser) {
            drawScale(player.analyser.context.sampleRate);
        }
    }

    function drawBars(dataArray, binsPerBar) {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, WIDTH, HEIGHT);

        for (let i = 0; i < BAR_COUNT; i++) {
            let sum = 0;
            for (let b = 0; b < binsPerBar; b++) {
                sum += dataArray[i * binsPerBar + b];
            }
            const avg  = sum / binsPerBar;
            const barH = Math.floor((avg / 255) * BAR_AREA);
            const x    = i * BAR_WIDTH;
            const y    = BAR_AREA - barH;

            ctx.globalAlpha = 0.3 + (avg / 255) * 0.7;
            ctx.fillStyle   = 'lightblue';
            ctx.fillRect(x, y, BAR_WIDTH - BAR_GAP, barH);
        }

        ctx.globalAlpha = 1;
    }

    function drawScale(sampleRate) {
        const ctx     = canvas.getContext('2d');
        const nyquist = sampleRate / 2;

        ctx.fillStyle = 'rgba(150, 200, 220, 0.6)';
        ctx.font      = '9px monospace';
        ctx.textAlign = 'center';

        for (const { freq, label } of SCALE_LABELS) {
            if (freq > nyquist) continue;

            const bar = Math.round((freq / nyquist) * BAR_COUNT);
            if (bar >= BAR_COUNT) continue;

            const x = bar * BAR_WIDTH + BAR_WIDTH / 2;

            // tick mark
            ctx.fillRect(x, BAR_AREA, 1, 4);
            // label
            ctx.fillText(label, x, HEIGHT - 2);
        }
    }
</script>

<canvas bind:this={canvas} width={WIDTH} height={HEIGHT}></canvas>
