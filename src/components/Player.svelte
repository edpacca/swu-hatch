<script>
    let { player, sampleRate, frameCount } = $props();

    let isPlaying = $state(false);

    $effect(() => {
        player.onPlayStateChange = (v) => { isPlaying = v; };
        return () => {
            player.onPlayStateChange = null;
            player.destroy();
        };
    });
</script>

<div class="info__container">
    <div>sample rate: {sampleRate}</div>
    <div>samples: {frameCount}</div>
    <div>duration: {(frameCount / sampleRate).toFixed(2)}s</div>
</div>

<div class="controls__container">
    <button onclick={() => player.toggle()} title={isPlaying ? 'Pause' : 'Play'}>
        {#if isPlaying}
            <svg viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="4" width="4" height="16"/>
                <rect x="14" y="4" width="4" height="16"/>
            </svg>
        {:else}
            <svg viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5,3 19,12 5,21"/>
            </svg>
        {/if}
    </button>
    <button onclick={() => player.stop()} title="Stop">
        <svg viewBox="0 0 24 24" fill="currentColor">
            <rect x="4" y="4" width="16" height="16"/>
        </svg>
    </button>
</div>

<style>
    .info__container {
        text-align: left;
    }

    .controls__container {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 0.5em;
        margin-top: 1em;
    }

    button {
        padding: 0.2rem;
        background-color: darkslategrey;
        border: 1px solid darkslategrey;
        border-radius: 0.2rem;
        height: 3rem;
        width: 3rem;
        color: lightblue;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    button:hover {
        border-color: lightblue;
    }

    svg {
        width: 1.4rem;
        height: 1.4rem;
    }
</style>
