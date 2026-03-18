<script>
    let { player, sampleRate, frameCount } = $props();

    let isPlaying = $state(false);

    $effect(() => {
        player.onPlayStateChange = (v) => { isPlaying = v; };
        return () => { player.onPlayStateChange = null; };
    });
</script>

<div>sample rate: {sampleRate}</div>
<div>samples: {frameCount}</div>
<div>duration: {(frameCount / sampleRate).toFixed(2)}s</div>
<button onclick={() => player.play()} disabled={isPlaying}>Play</button>
<button onclick={() => player.pause()}>Pause</button>
<button onclick={() => player.resume()}>Resume</button>
