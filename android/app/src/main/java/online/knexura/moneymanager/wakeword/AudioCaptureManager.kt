package online.knexura.moneymanager.wakeword

import android.annotation.SuppressLint
import android.media.AudioFormat
import android.media.AudioRecord
import android.media.MediaRecorder

/**
 * Captures 16 kHz mono PCM16 in a dedicated thread and hands out fixed-size chunks.
 * Audio is never stored or sent anywhere: it lives in a reusable buffer and is overwritten.
 */
class AudioCaptureManager(
    private val chunkSamples: Int,
    private val sampleRate: Int,
    private val onChunk: (ShortArray) -> Unit,
    private val onError: (Throwable) -> Unit,
) {
    @Volatile private var running = false
    private var record: AudioRecord? = null
    private var thread: Thread? = null

    @SuppressLint("MissingPermission") // The plugin checks RECORD_AUDIO before starting.
    @Synchronized
    fun start() {
        if (running) return
        val minBuffer = AudioRecord.getMinBufferSize(sampleRate, AudioFormat.CHANNEL_IN_MONO, AudioFormat.ENCODING_PCM_16BIT)
        if (minBuffer <= 0) throw IllegalStateException("Audio capture is not available")
        val bufferBytes = maxOf(minBuffer, chunkSamples * 2 * 4)
        val rec = AudioRecord(
            MediaRecorder.AudioSource.MIC,
            sampleRate,
            AudioFormat.CHANNEL_IN_MONO,
            AudioFormat.ENCODING_PCM_16BIT,
            bufferBytes,
        )
        if (rec.state != AudioRecord.STATE_INITIALIZED) {
            rec.release()
            throw IllegalStateException("Microphone unavailable")
        }
        rec.startRecording()
        record = rec
        running = true
        thread = Thread({
            val chunk = ShortArray(chunkSamples)
            try {
                while (running) {
                    var read = 0
                    while (running && read < chunkSamples) {
                        val n = rec.read(chunk, read, chunkSamples - read)
                        if (n < 0) throw IllegalStateException("AudioRecord read error $n")
                        read += n
                    }
                    if (running && read == chunkSamples) onChunk(chunk)
                }
            } catch (t: Throwable) {
                if (running) onError(t)
            }
        }, "WakeWordAudio").also { it.isDaemon = true; it.start() }
    }

    /** Stops capture and releases the microphone. Safe to call more than once. */
    fun stop() {
        val worker: Thread?
        synchronized(this) {
            running = false
            worker = thread
            thread = null
        }
        // Stopping the recorder unblocks a pending read.
        record?.let { runCatching { it.stop() } }
        if (worker != null && worker != Thread.currentThread()) runCatching { worker.join(1000) }
        synchronized(this) {
            record?.let { runCatching { it.release() } }
            record = null
        }
    }
}
