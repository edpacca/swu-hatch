<script>
    import { decodeWav } from "../lib/decode.js";
    import { Player } from "../lib/player.js";
    import PlayerComponent from "./Player.svelte";

    const player = new Player();
    let decoded = $state(null);

    async function handleFile(e) {
        const file = e.target.files[0];
        if (!file) return;
        const decodeResult = await decodeWav(file);
        player.setupContext();
        await player.loadBuffer(decodeResult);
        decoded = decodeResult;
    }
</script>

<main>
    <h1>SWU Hatch</h1>
    <h2>(słuchać)</h2>
    <div class="input__container">
        <input type="file" accept=".wav" onchange={handleFile} />
    </div>

    {#if decoded}
        <PlayerComponent {player} sampleRate={decoded.sampleRate} frameCount={decoded.frameCount} />
    {/if}
</main>

<style>
    main {
        display: flex;
        justify-content: center;
        flex-direction: column;
        height: calc(100vh - 16px);
        width: 100%;
        align-items: center;
        background-color: rgb(25, 25, 44);
        color: lightblue;
        font-family: sans-serif;
    }

    h1 {
        font-family: sans-serif;
        color: lightblue;
        margin-bottom: 0em;
    }

    h2 {
        margin-top: 0;
        font-style: italic;
    }

    .input__container {
        padding: 1rem;
    }

    input[type="file"]::file-selector-button {
        background-color: darkslategrey;
        color: lightblue;
        padding: 0.35rem;
        border: 1px solid darkslategrey;
        border-radius: 0.2rem;
    }

    input[type="file"]::file-selector-button:hover {
        border-color: lightblue;
    }
</style>
