<script lang="ts">
    import PlaybackControls from './PlaybackControls.svelte';
    import Waveform         from './Waveform.svelte';
    import Visualiser       from './Visualiser.svelte';
    import DspControls      from './DspControls.svelte';
    import type { Player }  from '../lib/player.js';

    interface Props {
        player:     Player;
        sampleRate: number;
        frameCount: number;
    }

    let { player, sampleRate, frameCount }: Props = $props();

    let isPlaying   = $state(false);
    let audioBuffer = $derived(player.audioBuffer);

    $effect(() => {
        player.onPlayStateChange = (v: boolean)      => { isPlaying   = v; };
        player.onBufferLoaded    = (b: AudioBuffer)  => { audioBuffer = b; };
        return () => {
            player.onPlayStateChange = null;
            player.onBufferLoaded    = null;
            player.destroy();
        };
    });
</script>

<div class="info">
    <div>sample rate: {sampleRate} Hz</div>
    <div>duration: {(frameCount / sampleRate).toFixed(2)}s</div>
</div>

<Waveform {audioBuffer} {player} {isPlaying} />
<Visualiser {player} {isPlaying} />
<div>
    <PlaybackControls {player} {isPlaying} />
    <DspControls {player} />
</div>

