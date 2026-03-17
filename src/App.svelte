<script>
    import { decodeWav, freeWav } from './decode.js';

    let output = $state('');

    async function handleFile(e) {
        const file = e.target.files[0];
        if (!file) return;

        const result = await decodeWav(file);
        output = `sample rate: ${result.sampleRate}, frames: ${result.frameCount}`;
        freeWav(result.resultPtr);
    }
</script>

<h1>SWU Hatch</h1>
<input type="file" accept=".wav" onchange={handleFile} />
<div>{output}</div>
