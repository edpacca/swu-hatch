CC      = emcc
OUT     = wasm-build/main.js
SRC     = main.cpp

EXPORTED_FUNCTIONS = '["_decode_wav", "_free_wav", "_malloc", "_free"]'
EXPORTED_RUNTIME   = '["cwrap", "HEAPU8", "HEAPU32", "HEAPU64"]'

FLAGS = \
	-I. \
	-s EXPORTED_FUNCTIONS=$(EXPORTED_FUNCTIONS) \
	-s EXPORTED_RUNTIME_METHODS=$(EXPORTED_RUNTIME) \
	-s ALLOW_MEMORY_GROWTH=1 \
	-s MODULARIZE=1 \
	-s EXPORT_ES6=1

.PHONY: all clean

all: $(OUT)

$(OUT): $(SRC)
	mkdir -p public/wasm
	$(CC) $(SRC) -o $(OUT) $(FLAGS)

clean:
	rm -f public/wasm/main.js public/wasm/main.wasm
