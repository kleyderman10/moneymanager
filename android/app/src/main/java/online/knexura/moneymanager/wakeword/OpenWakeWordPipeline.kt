package online.knexura.moneymanager.wakeword

import ai.onnxruntime.OnnxTensor
import ai.onnxruntime.OrtEnvironment
import ai.onnxruntime.OrtSession
import java.nio.FloatBuffer

/**
 * Streaming openWakeWord pipeline (mirrors openwakeword/utils.py AudioFeatures + Model.predict):
 *
 *   16 kHz mono PCM16, chunks of 1280 samples (80 ms)
 *   -> melspectrogram.onnx   input [1, samples] float32 (raw int16 values), output [1,1,frames,32]
 *      (the last 1760 samples are fed: 1280 new + 480 of context -> 8 frames), transform x / 10 + 2
 *   -> embedding_model.onnx  input [1, 76, 32, 1] (sliding window of 76 mel frames), output 96 floats
 *   -> classifier .onnx      input [1, 16, 96] (last 16 embeddings), output [1, 1] score
 *
 * Not thread safe: one thread must call [process]. Audio is only held in memory.
 */
class OpenWakeWordPipeline(
    private val env: OrtEnvironment,
    private val melSession: OrtSession,
    private val embeddingSession: OrtSession,
    private val classifierSession: OrtSession,
) : AutoCloseable {

    private val melInput = melSession.inputNames.first()
    private val embeddingInput = embeddingSession.inputNames.first()
    private val classifierInput = classifierSession.inputNames.first()

    // Last 1760 samples of audio (480 context + 1280 new), stored as floats.
    private val raw = FloatArray(CONTEXT_SAMPLES + CHUNK_SAMPLES)
    private var rawFilled = 0

    private val melFrames = ArrayDeque<FloatArray>()
    private val embeddings = ArrayDeque<FloatArray>()

    init {
        reset()
    }

    fun reset() {
        raw.fill(0f)
        rawFilled = 0
        melFrames.clear()
        embeddings.clear()
        // Same initial state as upstream: 76 frames of ones until real audio arrives.
        repeat(EMBEDDING_WINDOW) { melFrames.addLast(FloatArray(MEL_BINS) { 1f }) }
    }

    /** Feeds exactly [CHUNK_SAMPLES] samples. Returns the score, or null while warming up. */
    fun process(chunk: ShortArray): Float? {
        require(chunk.size == CHUNK_SAMPLES) { "Expected $CHUNK_SAMPLES samples" }

        // Slide the window: keep the last 480 samples as context, append the new chunk.
        System.arraycopy(raw, CHUNK_SAMPLES, raw, 0, CONTEXT_SAMPLES)
        for (i in 0 until CHUNK_SAMPLES) raw[CONTEXT_SAMPLES + i] = chunk[i].toFloat()
        rawFilled = minOf(rawFilled + CHUNK_SAMPLES, raw.size)
        // Until the context is full the first window is shorter; upstream behaves the same.
        val window = if (rawFilled < raw.size) raw.copyOfRange(raw.size - rawFilled, raw.size) else raw

        appendMelFrames(window)
        appendEmbedding()
        if (embeddings.size < CLASSIFIER_FRAMES) return null
        return classify()
    }

    private fun appendMelFrames(window: FloatArray) {
        OnnxTensor.createTensor(env, FloatBuffer.wrap(window), longArrayOf(1, window.size.toLong())).use { input ->
            melSession.run(mapOf(melInput to input)).use { result ->
                val out = (result.get(0) as OnnxTensor).floatBuffer
                val frames = out.remaining() / MEL_BINS
                for (f in 0 until frames) {
                    val row = FloatArray(MEL_BINS)
                    for (b in 0 until MEL_BINS) row[b] = out.get(f * MEL_BINS + b) / 10f + 2f
                    melFrames.addLast(row)
                }
            }
        }
        while (melFrames.size > MEL_MAX_FRAMES) melFrames.removeFirst()
    }

    private fun appendEmbedding() {
        val flat = FloatArray(EMBEDDING_WINDOW * MEL_BINS)
        val start = melFrames.size - EMBEDDING_WINDOW
        for (i in 0 until EMBEDDING_WINDOW) {
            System.arraycopy(melFrames[start + i], 0, flat, i * MEL_BINS, MEL_BINS)
        }
        val shape = longArrayOf(1, EMBEDDING_WINDOW.toLong(), MEL_BINS.toLong(), 1)
        OnnxTensor.createTensor(env, FloatBuffer.wrap(flat), shape).use { input ->
            embeddingSession.run(mapOf(embeddingInput to input)).use { result ->
                val out = (result.get(0) as OnnxTensor).floatBuffer
                val vector = FloatArray(EMBEDDING_SIZE)
                out.get(vector)
                embeddings.addLast(vector)
            }
        }
        while (embeddings.size > CLASSIFIER_FRAMES) embeddings.removeFirst()
    }

    private fun classify(): Float {
        val flat = FloatArray(CLASSIFIER_FRAMES * EMBEDDING_SIZE)
        embeddings.forEachIndexed { i, e -> System.arraycopy(e, 0, flat, i * EMBEDDING_SIZE, EMBEDDING_SIZE) }
        val shape = longArrayOf(1, CLASSIFIER_FRAMES.toLong(), EMBEDDING_SIZE.toLong())
        OnnxTensor.createTensor(env, FloatBuffer.wrap(flat), shape).use { input ->
            classifierSession.run(mapOf(classifierInput to input)).use { result ->
                return (result.get(0) as OnnxTensor).floatBuffer.get(0)
            }
        }
    }

    override fun close() {
        runCatching { classifierSession.close() }
        runCatching { embeddingSession.close() }
        runCatching { melSession.close() }
    }

    companion object {
        const val SAMPLE_RATE = 16000
        const val CHUNK_SAMPLES = 1280
        private const val CONTEXT_SAMPLES = 160 * 3
        private const val MEL_BINS = 32
        private const val EMBEDDING_WINDOW = 76
        private const val EMBEDDING_SIZE = 96
        private const val CLASSIFIER_FRAMES = 16
        private const val MEL_MAX_FRAMES = 10 * 97
    }
}
