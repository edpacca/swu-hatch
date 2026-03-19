<script lang="ts">
    import PlaybackControls  from './PlaybackControls.svelte';
    import Waveform          from './Waveform.svelte';
    import DspControls       from './DspControls.svelte';
    import VisualisersPanel  from './VisualisersPanel.svelte';
    import type { Player }   from '../lib/player.ts';

    interface Props {
        player:     Player;
        sampleRate: number;
        frameCount: number;
    }

    let { player, sampleRate, frameCount }: Props = $props();

    let isPlaying   = $state(false);
    let audioBuffer = $derived(player.audioBuffer);

    const duration = $derived((frameCount / sampleRate).toFixed(2));

    $effect(() => {
        player.onPlayStateChange = (v: boolean)     => { isPlaying   = v; };
        player.onBufferLoaded    = (b: AudioBuffer) => { audioBuffer = b; };
        return () => {
            player.onPlayStateChange = null;
            player.onBufferLoaded    = null;
            player.destroy();
        };
    });
</script>

<div class="player">

    <header class="info-bar">
        <span>{sampleRate} Hz</span>
        <span class="sep">·</span>
        <span>{duration}s</span>
    </header>

    <section class="waveform-section">
        <Waveform {audioBuffer} {player} {isPlaying} />
    </section>

    <section class="controls-section">
        <div class="playback-col">
            <PlaybackControls {player} {isPlaying} />
        </div>
        <div class="dsp-col">
            <DspControls {player} />
        </div>
    </section>

    <section class="analysis-section">
        <VisualisersPanel {player} {isPlaying} />
    </section>

</div>

<style>
    .player {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        padding: 1.25rem 1.5rem 1.5rem;
        background: rgba(255, 255, 255, 0.025);
        border: 1px solid rgba(150, 200, 220, 0.1);
        border-radius: 0.5rem;
    }

    /* ── info bar ─────────────────────────────── */
    .info-bar {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font: 10px monospace;
        color: rgba(150, 200, 220, 0.4);
        letter-spacing: 0.05em;
    }

    .sep { opacity: 0.3; }

    /* ── waveform ─────────────────────────────── */
    .waveform-section {
        line-height: 0; /* remove inline baseline gap below canvas */
    }

    /* ── controls: playback + dsp side-by-side ── */
    .controls-section {
        display: grid;
        grid-template-columns: auto 1fr;
        align-items: center;
        gap: 1.25rem;
        padding: 0.5rem 0.75rem;
        background: rgba(150, 200, 220, 0.03);
        border: 1px solid rgba(150, 200, 220, 0.08);
        border-radius: 0.35rem;
    }

    .playback-col {
        display: flex;
        align-items: center;
        justify-content: center;
        padding-right: 1.25rem;
        border-right: 1px solid rgba(150, 200, 220, 0.1);
    }

    /* PlaybackControls puts margin-top on its inner grid; cancel it here */
    .playback-col :global(.controls) {
        margin-top: 0;
    }

    .dsp-col {
        min-width: 0; /* allow flex children to shrink */
    }

    /* ── analysis panel ───────────────────────── */
    .analysis-section {
        /* VisualisersPanel handles its own border/padding */
    }
</style>
