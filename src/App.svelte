<script>
    import { decodeWav, freeWav } from "./decode.js";

    let output = $state("");

    async function handleFile(e) {
        const file = e.target.files[0];
        if (!file) return;

        const result = await decodeWav(file);
        output = `sample rate: ${result.sampleRate}, frames: ${result.frameCount}`;
        freeWav(result.resultPtr);
    }
</script>

<main>
    <h1>SWU Hatch</h1>
    <input type="file" accept=".wav" onchange={handleFile} />
    <div>{output}</div>
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
