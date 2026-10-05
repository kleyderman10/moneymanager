package online.knexura.moneymanager.wakeword

import android.Manifest
import com.getcapacitor.JSObject
import com.getcapacitor.PermissionState
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.getcapacitor.annotation.Permission
import com.getcapacitor.annotation.PermissionCallback

/**
 * Capacitor bridge. Only events and metrics cross to JavaScript, never audio.
 * Events: wakeWordDetected, wakeWordStateChanged, wakeWordError, wakeWordPermissionChanged and
 * wakeWordScore (debug builds only).
 */
@CapacitorPlugin(
    name = "WakeWord",
    permissions = [Permission(strings = [Manifest.permission.RECORD_AUDIO], alias = "microphone")],
)
class WakeWordPlugin : Plugin(), WakeWordListener {
    private var engine: WakeWordEngine? = null

    private fun engine(): WakeWordEngine =
        engine ?: WakeWordEngine(context.applicationContext, this).also { engine = it }

    private fun guarded(call: PluginCall, block: () -> Unit) {
        try {
            block()
        } catch (e: Throwable) {
            val code = (e as? WakeWordException)?.code ?: "UNKNOWN"
            call.reject(e.message ?: code, code)
        }
    }

    private fun hasMicrophone() = getPermissionState("microphone") == PermissionState.GRANTED

    @PluginMethod
    fun initialize(call: PluginCall) = guarded(call) {
        val model = call.getString("model") ?: "oye_flow.onnx"
        // Bare file names only: models ship inside the app.
        if (model.contains('/') || model.contains("..") || !model.endsWith(".onnx")) {
            call.reject("Invalid model name", "MODEL_NOT_FOUND")
            return@guarded
        }
        val engine = engine()
        engine.debug = call.getBoolean("debug", false) == true
        engine.initialize(
            model,
            call.getString("phrase") ?: "oye_flow",
            call.getFloat("threshold"),
            call.getLong("cooldownMs"),
        )
        call.resolve(stateObject())
    }

    @PluginMethod
    fun start(call: PluginCall) {
        if (!hasMicrophone()) {
            requestPermissionForAlias("microphone", call, "microphonePermissionCallback")
            return
        }
        doStart(call)
    }

    @PermissionCallback
    private fun microphonePermissionCallback(call: PluginCall) {
        val granted = hasMicrophone()
        notifyListeners("wakeWordPermissionChanged", JSObject().put("granted", granted))
        if (!granted) call.reject("Microphone permission denied", "MICROPHONE_PERMISSION_DENIED") else doStart(call)
    }

    private fun doStart(call: PluginCall) = guarded(call) {
        engine().start()
        call.resolve(stateObject())
    }

    @PluginMethod
    fun stop(call: PluginCall) = guarded(call) {
        engine?.stop()
        call.resolve(stateObject())
    }

    @PluginMethod
    fun pause(call: PluginCall) = guarded(call) {
        engine?.pause()
        call.resolve(stateObject())
    }

    @PluginMethod
    fun resume(call: PluginCall) {
        if (!hasMicrophone()) {
            call.reject("Microphone permission denied", "MICROPHONE_PERMISSION_DENIED")
            return
        }
        guarded(call) {
            engine?.resume()
            call.resolve(stateObject())
        }
    }

    @PluginMethod
    fun getState(call: PluginCall) {
        call.resolve(stateObject())
    }

    @PluginMethod
    fun setThreshold(call: PluginCall) = guarded(call) {
        val value = call.getFloat("threshold")
        if (value == null || value <= 0f || value >= 1f) {
            call.reject("threshold must be between 0 and 1", "INVALID_THRESHOLD")
            return@guarded
        }
        engine().threshold = value
        call.resolve(stateObject())
    }

    @PluginMethod
    fun destroy(call: PluginCall) = guarded(call) {
        engine?.destroy()
        call.resolve()
    }

    private fun stateObject(): JSObject {
        val e = engine
        return JSObject()
            .put("state", (e?.state ?: WakeWordState.UNINITIALIZED).name)
            .put("threshold", (e?.threshold ?: 0.5f).toDouble())
    }

    override fun handleOnDestroy() {
        engine?.destroy()
        super.handleOnDestroy()
    }

    // --- WakeWordListener ---
    override fun onDetected(phrase: String, score: Float, timestamp: Long) {
        notifyListeners("wakeWordDetected", JSObject().put("phrase", phrase).put("score", score.toDouble()).put("timestamp", timestamp))
    }

    override fun onState(state: WakeWordState) {
        notifyListeners("wakeWordStateChanged", JSObject().put("state", state.name))
    }

    override fun onError(code: String, message: String) {
        notifyListeners("wakeWordError", JSObject().put("code", code).put("message", message))
    }

    override fun onScore(score: Float, peak: Float) {
        notifyListeners("wakeWordScore", JSObject().put("score", score.toDouble()).put("peak", peak.toDouble()))
    }
}
