<script>
    let { sampleRate, frameCount, wasmPtr } = $props();
    import { freeWav, getWasmSamples } from "./decode.js";

    const ctx = new AudioContext();

    let sourceNode = $state();
    let isPlaying = $state(false);
    let audioBuffer = $state();

    $effect(() => {
        let cancelled = false;

        async function setup() {
            let buffer = ctx.createBuffer(1, frameCount, sampleRate);
            console.log("AudioBuffer created:", buffer);
            console.log("Buffer duration:", buffer.duration, "seconds");
            console.log(wasmPtr);

            const wasmSamples = await getWasmSamples(wasmPtr, frameCount);

            console.log("WASM samples type:", wasmSamples?.constructor?.name);
            console.log("WASM samples length:", wasmSamples?.length);
            console.log("First 10 samples:", wasmSamples?.slice(0, 10));
            console.log(
                "Sample range — min:",
                Math.min(...wasmSamples.slice(0, 1000)),
                "max:",
                Math.max(...wasmSamples.slice(0, 1000)),
            );

            buffer.copyToChannel(wasmSamples, 0, 0);
            audioBuffer = buffer;
            const node = ctx.createBufferSource();
            node.buffer = buffer;
            node.connect(ctx.destination);
            node.onended = () => {
                isPlaying = false;
            };

            sourceNode = node;
            isPlaying = false;

            console.log(sourceNode);
        }

        setup();
        // Cleanup when effect re-runs
        return () => {
            cancelled - true;
            if (sourceNode) sourceNode.disconnect();
            freeWav(wasmPtr);
        };
    });

    function play() {
        if (!audioBuffer) return;

        // AudioBufferSourceNode can only be started once, so create a fresh one
        if (isPlaying) return;

        const node = ctx.createBufferSource();
        node.buffer = audioBuffer;
        node.connect(ctx.destination);
        node.onended = () => { isPlaying = false; };
        sourceNode = node;

        if (ctx.state === "suspended") {
            ctx.resume().then(() => {
                node.start(0);
                isPlaying = true;
            });
        } else {
            node.start(0);
            isPlaying = true;
        }
    }

    function pause() {
        if (isPlaying) {
            isPlaying = false;
            ctx.suspend();
        }
    }

    function resume() {
        if (ctx.state === "suspended") ctx.resume();
    }
</script>

<div>sample rate: {sampleRate}</div>
<div>samples: {frameCount}</div>
<div>duration: {(frameCount / sampleRate).toFixed(2)}s</div>
<button onclick={play} disabled={isPlaying}>Play</button>
<button onclick={pause}>Pause</button>
<button onclick={resume}>Resume</button>
