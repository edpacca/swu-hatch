<script lang="ts">
    import type { Player } from '../lib/player.ts';

    interface Props {
        player: Player;
    }

    let { player }: Props = $props();

    let gain   = $state(1.0);
    let cutoff = $state(1.0);
    let rate   = $state(1.0);
    let bypass = $state(false);

    function handleGain(e: Event) {
        gain = parseFloat((e.target as HTMLInputElement).value);
        player.setGain(gain);
    }

    function handleCutoff(e: Event) {
        cutoff = parseFloat((e.target as HTMLInputElement).value);
        player.setCutoff(cutoff);
    }

    function handleRate(e: Event) {
        rate = parseFloat((e.target as HTMLInputElement).value);
        player.setRate(rate);
    }

    function toggleBypass() {
        bypass = !bypass;
        player.setBypass(bypass);
    }
</script>

<div class="dsp-controls">
    <label>
        <span>Gain <em>{gain.toFixed(2)}</em></span>
        <input type="range" min="0" max="2" step="0.01" value={gain} oninput={handleGain} />
    </label>

    <label>
        <span>Rate <em>{rate.toFixed(2)}</em></span>
        <input type="range" min="0" max="5" step="0.01" value={rate} oninput={handleRate} />
        <button title="reset-rate" onclick={() => { player.setRate(1.0); rate = 1.0;}}>reset</button>
    </label>

    <label>
        <span>Cutoff <em>{cutoff.toFixed(2)}</em></span>
        <input type="range" min="0" max="1" step="0.01" value={cutoff} oninput={handleCutoff} />
    </label>

    <button class:active={bypass} onclick={toggleBypass}>
        {bypass ? 'Bypass ON' : 'Bypass OFF'}
    </button>
</div>

<style>
    .dsp-controls {
        display: flex;
        flex-direction: column;
        gap: 0.6rem;
        padding: 0.75rem 1rem;
        border: 1px solid rgba(173, 216, 230, 0.2);
        border-radius: 0.4rem;
        width: 100%;
        box-sizing: border-box;
    }

    label {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        font-size: 0.85rem;
    }

    label span {
        width: 7rem;
        flex-shrink: 0;
    }

    em {
        font-style: normal;
        color: white;
        margin-left: 0.25rem;
    }

    input[type="range"] {
        flex: 1;
        accent-color: lightblue;
    }

    button {
        align-self: flex-start;
        background: transparent;
        border: 1px solid lightblue;
        color: lightblue;
        padding: 0.25rem 0.75rem;
        border-radius: 0.2rem;
        cursor: pointer;
        font-size: 0.8rem;
    }

    button.active {
        background: lightblue;
        color: rgb(25, 25, 44);
    }
</style>
