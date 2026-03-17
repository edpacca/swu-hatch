#include <emscripten/emscripten.h>
#include <stdio.h>
#include <stdint.h>
#define DR_WAV_IMPLEMENTATION
#include <dr_libs/dr_wav.h>

extern "C" {
    EMSCRIPTEN_KEEPALIVE
    float* decode_wav(uint8_t* data, size_t length, uint32_t* out_sample_rate, uint64_t* out_frame_count) {
        unsigned int channels;
        unsigned int sampleRate;
        drwav_uint64 frameCount;

        float* samples = drwav_open_memory_and_read_pcm_frames_f32(
            data, length, &channels, &sampleRate, &frameCount, nullptr
        );

        if (samples == nullptr) return nullptr;

        *out_sample_rate = sampleRate;
        *out_frame_count = frameCount;
        return samples; // caller must free via free_wav()
    }

    EMSCRIPTEN_KEEPALIVE
    void free_wav(float* ptr) {
        drwav_free(ptr, nullptr);
    }
}
