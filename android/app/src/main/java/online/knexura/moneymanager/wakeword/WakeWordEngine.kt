package online.knexura.moneymanager.wakeword

import ai.onnxruntime.OrtEnvironment
import ai.onnxruntime.OrtSession
import android.content.Context

enum class WakeWordState { UNINITIALIZED, INITIALIZING, READY, LISTENING, PAUSED, DETECTED, ERROR }

class WakeWordException(val code: String, message: String, cause: Throwable? = null) : Exception(message, cause)

interface WakeWordListener {
    fun onDetected(phrase: String, score: Float, timestamp: Long)
    fun onState(state: WakeWordState)
    fun onError(code: String, message: String)
    fun onScore(score: Float, peak: Float) {}
}

/**
 * Owns the models and the microphone. The microphone is only held while LISTENING: pause() and
 * stop() release it so another consumer (the assistant) can capture it.
 * All state changes go through [lock] to avoid double start/stop and resume-before-release races.
 */
class WakeWordEngine(
    private val context: Context,
    private val listener: WakeWordListener,
) {
    private val lock = Any()
    private var pipeline: OpenWakeWordPipeline? = null
    private var capture: AudioCaptureManager? = null

    @Volatile var state = WakeWordState.UNINITIALIZED
        private set
    @Volatile var threshold = 0.5f
    @Volatile var cooldownMs = 2000L
    @Volatile var debug = false

    private var phrase = "oye_flow"
    @Volatile private var lastDetectionAt = 0L
    @Volatile private var peak = 0f
    private var lastScoreEmit = 0L
    private var consecutiveErrors = 0

    private fun setState(next: WakeWordState) {
        state = next
        listener.onState(next)
    }

    fun initialize(model: String, phraseName: String, thresholdValue: Float?, cooldown: Long?) {
        synchronized(lock) {
            if (state != WakeWordState.UNINITIALIZED && state != WakeWordState.ERROR) return
            setState(WakeWordState.INITIALIZING)
            try {
                val environment = OrtEnvironment.getEnvironment()
                fun load(name: String): OrtSession {
                    val bytes = try {
                        context.assets.open("wakewords/$name").use { it.readBytes() }
                    } catch (e: Exception) {
                        throw WakeWordException("MODEL_NOT_FOUND", "Model $name not found", e)
                    }
                    val options = OrtSession.SessionOptions().apply {
                        setIntraOpNumThreads(1)
                        setInterOpNumThreads(1)
                    }
                    return try {
                        environment.createSession(bytes, options)
                    } catch (e: Exception) {
                        throw WakeWordException("MODEL_LOAD_ERROR", "Model $name could not be loaded", e)
                    }
                }
                val mel = load("melspectrogram.onnx")
                val emb = load("embedding_model.onnx")
                val cls = load(model)
                pipeline = OpenWakeWordPipeline(environment, mel, emb, cls)
                phrase = phraseName
                thresholdValue?.let { threshold = it }
                cooldown?.let { cooldownMs = it }
                setState(WakeWordState.READY)
            } catch (e: WakeWordException) {
                fail(e.code, e.message ?: e.code)
                throw e
            } catch (e: Throwable) {
                fail("ORT_INITIALIZATION_ERROR", "Wake word engine failed to initialize")
                throw WakeWordException("ORT_INITIALIZATION_ERROR", e.message ?: "init", e)
            }
        }
    }

    fun start() {
        synchronized(lock) {
            when (state) {
                WakeWordState.UNINITIALIZED, WakeWordState.INITIALIZING, WakeWordState.ERROR ->
                    throw WakeWordException("NOT_INITIALIZED", "Initialize first")
                WakeWordState.LISTENING -> throw WakeWordException("ALREADY_RUNNING", "Already listening")
                else -> Unit
            }
            beginCapture()
        }
    }

    fun pause() {
        synchronized(lock) {
            if (state != WakeWordState.LISTENING && state != WakeWordState.DETECTED) return
            endCapture()
            setState(WakeWordState.PAUSED)
        }
    }

    fun resume() {
        synchronized(lock) {
            if (state != WakeWordState.PAUSED && state != WakeWordState.DETECTED && state != WakeWordState.READY) return
            beginCapture()
        }
    }

    /** Stops listening and releases the microphone; models stay loaded. */
    fun stop() {
        synchronized(lock) {
            if (state == WakeWordState.LISTENING || state == WakeWordState.PAUSED || state == WakeWordState.DETECTED) {
                endCapture()
                setState(WakeWordState.READY)
            }
        }
    }

    fun destroy() {
        synchronized(lock) {
            endCapture()
            runCatching { pipeline?.close() }
            pipeline = null
            state = WakeWordState.UNINITIALIZED
        }
    }

    private fun beginCapture() {
        val pipe = pipeline ?: throw WakeWordException("NOT_INITIALIZED", "Initialize first")
        pipe.reset()
        peak = 0f
        val manager = AudioCaptureManager(
            OpenWakeWordPipeline.CHUNK_SAMPLES,
            OpenWakeWordPipeline.SAMPLE_RATE,
            ::onChunk,
            ::onCaptureError,
        )
        try {
            manager.start()
        } catch (e: Throwable) {
            fail("MICROPHONE_UNAVAILABLE", "Microphone unavailable")
            throw WakeWordException("MICROPHONE_UNAVAILABLE", e.message ?: "mic", e)
        }
        capture = manager
        consecutiveErrors = 0
        setState(WakeWordState.LISTENING)
    }

    private fun endCapture() {
        val current = capture
        capture = null
        current?.stop()
    }

    // Runs on the audio thread. Never touches the main thread.
    private fun onChunk(chunk: ShortArray) {
        val pipe = pipeline ?: return
        val score = try {
            pipe.process(chunk)
        } catch (t: Throwable) {
            consecutiveErrors++
            if (consecutiveErrors >= 3) {
                // No restart loop: stop and let the app decide.
                Thread {
                    synchronized(lock) {
                        if (state == WakeWordState.LISTENING) {
                            endCapture()
                            fail("INFERENCE_ERROR", "Inference failed")
                        }
                    }
                }.start()
            }
            return
        }
        consecutiveErrors = 0
        if (score == null) return
        if (score > peak) peak = score
        val now = System.currentTimeMillis()
        if (debug && now - lastScoreEmit >= 200) {
            lastScoreEmit = now
            listener.onScore(score, peak)
        }
        if (score >= threshold && now - lastDetectionAt >= cooldownMs && state == WakeWordState.LISTENING) {
            lastDetectionAt = now
            // The microphone is released from another thread: this one is the capture thread.
            Thread {
                synchronized(lock) {
                    if (state != WakeWordState.LISTENING) return@Thread
                    endCapture()
                    setState(WakeWordState.DETECTED)
                }
                listener.onDetected(phrase, score, now)
            }.start()
        }
    }

    private fun onCaptureError(t: Throwable) {
        Thread {
            synchronized(lock) {
                if (state != WakeWordState.LISTENING) return@Thread
                endCapture()
                fail("AUDIO_CAPTURE_ERROR", "Audio capture failed")
            }
        }.start()
    }

    private fun fail(code: String, message: String) {
        state = WakeWordState.ERROR
        listener.onState(WakeWordState.ERROR)
        listener.onError(code, message)
    }
}
