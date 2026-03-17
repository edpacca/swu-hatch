# Backlog

## Phase 1 — Audio Decoding
- [x] Write a C++ function that accepts a byte array + length, decodes it with dr_wav, and returns a pointer to a float PCM sample array. Export it via `extern "C"`.
- [x] Update your emcc command to increase memory and export the new functions:
  ```bash
  emcc audio.cpp -o audio.js \
    -s EXPORTED_FUNCTIONS='["_decode_wav", "_get_sample_count", "_get_sample_rate"]' \
    -s EXPORTED_RUNTIME_METHODS='["cwrap", "ccall", "HEAPF32"]' \
    -s ALLOW_MEMORY_GROWTH=1
  ```
- [x] In JS, use a file input to read a WAV file as an ArrayBuffer, pass the bytes into WASM memory, call your decode function, and read back the float array via HEAPF32.

✅ Milestone: Browser decodes a WAV file into a raw float sample array in WASM memory.

## Phase 2 — Playback via Web Audio API
- [ ] Copy decoded HEAPF32 samples into an AudioBuffer using `copyToChannel()`.
- [ ] Create an `AudioBufferSourceNode`, assign the buffer, connect to destination.
- [ ] Add Play/Pause buttons using `AudioContext.suspend()`/`resume()`.
- [ ] Free the WASM-side buffer via `freeWav()` once the AudioBuffer is populated.

✅ Milestone: WAV file plays through the browser.

## Phase 3 — Real-Time DSP via AudioWorklet + WASM
- [ ] Write a C++ `process_block(float* input, float* output, int frame_count)` function that applies an audio effect (e.g., gain, low-pass filter) to a block of samples in-place. Export it via `extern "C"`.
- [ ] Update the emcc build to produce a standalone WASM binary (no JS glue) suitable for loading inside an AudioWorklet:
  ```bash
  emcc dsp.cpp -o dsp.wasm \
    -s STANDALONE_WASM=1 \
    -s EXPORTED_FUNCTIONS='["_process_block", "_malloc", "_free"]' \
    --no-entry
  ```
- [ ] Create an `AudioWorkletProcessor` subclass that:
    - Loads and instantiates the DSP WASM module in its constructor.
    - Allocates persistent input/output buffers in WASM linear memory.
    - In `process()`, copies input samples into the WASM buffer, calls `_process_block`, and copies results to the output.
- [ ] Register the worklet with `audioContext.audioWorklet.addModule()`, create the corresponding `AudioWorkletNode`, and wire it into the audio graph between the source and destination:
  ```
  AudioBufferSourceNode → AudioWorkletNode (WASM DSP) → AudioContext.destination
  ```
- [ ] Expose DSP parameters (e.g., gain level, filter cutoff) to the main thread via `AudioParam` descriptors or `MessagePort`, so UI controls can adjust the effect in real time.
- [ ] Add a bypass toggle that disconnects the worklet node and connects the source directly to the destination for A/B comparison.

✅ Milestone: Audio plays through a C++/WASM DSP pipeline in real time with adjustable parameters.
