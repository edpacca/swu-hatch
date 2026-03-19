<script lang="ts">
    import OscilloscopeVisualiser from './OscilloscopeVisualiser.svelte';
    import SpectrumVisualiser     from './SpectrumVisualiser.svelte';
    import type { Player } from '../lib/player.ts';

    interface Props {
        player:    Player;
        isPlaying: boolean;
    }

    let { player, isPlaying }: Props = $props();

    type Tab = 'oscilloscope' | 'spectrum';
    let activeTab = $state<Tab>('oscilloscope');
</script>

<div class="panel">
    <div class="tabs" role="tablist">
        <button
            role="tab"
            aria-selected={activeTab === 'oscilloscope'}
            class:active={activeTab === 'oscilloscope'}
            onclick={() => activeTab = 'oscilloscope'}
        >oscilloscope</button>

        <button
            role="tab"
            aria-selected={activeTab === 'spectrum'}
            class:active={activeTab === 'spectrum'}
            onclick={() => activeTab = 'spectrum'}
        >spectrum</button>
    </div>

    <div class="content">
        {#if activeTab === 'oscilloscope'}
            <OscilloscopeVisualiser {player} {isPlaying} />
        {:else}
            <SpectrumVisualiser {player} {isPlaying} />
        {/if}
    </div>
</div>

<style>
    .panel {
        border: 1px solid rgba(150, 200, 220, 0.12);
        border-radius: 0.35rem;
        overflow: hidden;
    }

    .tabs {
        display: flex;
        border-bottom: 1px solid rgba(150, 200, 220, 0.12);
    }

    .tabs button {
        flex: 1;
        padding: 0.35rem 0;
        background: transparent;
        border: none;
        border-bottom: 2px solid transparent;
        margin-bottom: -1px;
        color: rgba(150, 200, 220, 0.35);
        font: 9px monospace;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        cursor: pointer;
        transition: color 0.15s, background 0.15s;
    }

    .tabs button:hover {
        background: rgba(150, 200, 220, 0.04);
        color: rgba(150, 200, 220, 0.65);
    }

    .tabs button.active {
        color: lightblue;
        border-bottom-color: lightblue;
        background: rgba(150, 200, 220, 0.06);
    }

    .content {
        padding: 0.5rem;
    }
</style>
