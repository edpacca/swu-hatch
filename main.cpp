#include <emscripten/emscripten.h>
#include <dr_libs/dr_wav.h>

extern "C" {
    EMSCRIPTEN_KEEPALIVE
    void free_wav(float* ptr) {
        drwav_free(ptr, nullptr);
    }
}
