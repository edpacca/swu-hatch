#include <emscripten/emscripten.h>
#include <stdlib.h>
#include <math.h>

// DSP state — persists across process_block calls for the lifetime of the module instance
static float s_gain = 1.0f;
static float s_alpha = 1.0f;                  // IIR filter coefficient: 1.0 = all-pass (no filtering)
static float s_prev_output[2] = {0.0f, 0.0f}; // Per-channel filter memory (max 2 channels)

extern "C"
{

    // normalized_gain: 0.0–1.0, mapped through a quadratic curve for perceptual smoothness
    EMSCRIPTEN_KEEPALIVE
    void set_gain(float normalized_gain)
    {
        s_gain = normalized_gain * normalized_gain;
    }

    // normalized_cutoff: 0.0–1.0 where 1.0 = no filtering, 0.0 = silence
    // Mapped through a cubic curve so the effect is distributed across the full control range
    EMSCRIPTEN_KEEPALIVE
    void set_cutoff(float normalized_cutoff)
    {
        s_alpha = normalized_cutoff * normalized_cutoff * normalized_cutoff;
    }

    // Applies gain then one-pole IIR low-pass on interleaved stereo samples.
    // input and output may point to the same buffer.
    EMSCRIPTEN_KEEPALIVE
    void process_block(float *input, float *output, int frame_count, int channels)
    {
        int total_samples = frame_count * channels;

        for (int i = 0; i < total_samples; i++)
        {
            int ch = i % channels;

            // Apply gain, then filter: y[n] = alpha * x[n] + (1 - alpha) * y[n-1]
            float gained = input[i] * s_gain;
            float filtered = s_alpha * gained + (1.0f - s_alpha) * s_prev_output[ch];
            s_prev_output[ch] = filtered;
            output[i] = filtered;
        }
    }

} // extern "C"
