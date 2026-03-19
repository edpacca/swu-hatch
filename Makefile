CC = emcc

# --- Decode (WAV decoder + player bridge) ---
DECODE_OUT        = wasm-build/decode.js
DECODE_SRC        = decode.cpp main.cpp
DECODE_EXPORTS    = '["_decode_wav", "_free_wav", "_malloc", "_free"]'
DECODE_RUNTIME    = '["cwrap", "HEAPU8", "HEAPU32", "HEAPF32", "HEAPU64"]'
DECODE_FLAGS      = \
	-I. \
	-s EXPORTED_FUNCTIONS=$(DECODE_EXPORTS) \
	-s EXPORTED_RUNTIME_METHODS=$(DECODE_RUNTIME) \
	-s ALLOW_MEMORY_GROWTH=1 \
	-s MODULARIZE=1 \
	-s EXPORT_ES6=1

# --- DSP (AudioWorklet processor) ---
DSP_OUT           = wasm-build/dsp.wasm
DSP_SRC           = dsp.cpp
DSP_EXPORTS       = '["_process_block", "_set_gain", "_set_cutoff", "_malloc", "_free"]'
DSP_FLAGS         = \
	-I. \
	-s STANDALONE_WASM=1 \
	-s EXPORTED_FUNCTIONS=$(DSP_EXPORTS) \
	--no-entry

.PHONY: all clean

all: $(DECODE_OUT) $(DSP_OUT)

$(DECODE_OUT): $(DECODE_SRC)
	mkdir -p public/wasm
	$(CC) $(DECODE_SRC) -o $(DECODE_OUT) $(DECODE_FLAGS)

$(DSP_OUT): $(DSP_SRC)
	$(CC) $(DSP_SRC) -o $(DSP_OUT) $(DSP_FLAGS)

clean:
	rm -f wasm-build/decode.js wasm-build/decode.wasm wasm-build/dsp.wasm
