<script>
    import { decodeWav } from "./decode.js";
    import Player from "./Player.svelte";

    let decodedWav = $state("");

    async function handleFile(e) {
        const file = e.target.files[0];
        if (!file) return;

        const result = await decodeWav(file);
        decodedWav = result;
        console.log(result);
    }
</script>

<main>
    <h1>SWU Hatch</h1>
    <input type="file" accept=".wav" onchange={handleFile} />

    {#if decodedWav}
        <Player
            sampleRate={decodedWav.sampleRate}
            frameCount={decodedWav.frameCount}
            wasmPtr={decodedWav.resultPtr}
        />
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
        background-color: darkblue;
        color: lightblue;
        font-family: sans-serif;
    }

    h1 {
        font-family: sans-serif;
        color: lightblue;
    }
</style>
