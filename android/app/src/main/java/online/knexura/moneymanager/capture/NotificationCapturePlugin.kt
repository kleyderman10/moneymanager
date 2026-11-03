package online.knexura.moneymanager.capture

import android.content.Intent
import android.provider.Settings
import androidx.core.app.NotificationManagerCompat
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

/**
 * Capacitor bridge for the bank-notification capture. JavaScript only configures it (API address,
 * capture token, bank apps to listen to) and asks whether the user granted "notification access";
 * the notification contents are handled natively and never cross to the web layer.
 */
@CapacitorPlugin(name = "NotificationCapture")
class NotificationCapturePlugin : Plugin() {

    private fun listenerGranted() =
        NotificationManagerCompat.getEnabledListenerPackages(context).contains(context.packageName)

    private fun statusObject(): JSObject {
        val config = CapturePrefs.read(context)
        return JSObject()
            .put("listenerGranted", listenerGranted())
            .put("enabled", config?.enabled == true)
            .put("configured", config != null)
    }

    @PluginMethod
    fun configure(call: PluginCall) {
        val baseUrl = call.getString("baseUrl")
        val token = call.getString("token")
        // Only HTTPS endpoints and well-formed tokens: the alert text travels over this connection.
        if (baseUrl == null || !baseUrl.startsWith("https://") || token == null || !token.startsWith("kfc_")) {
            call.reject("Invalid configuration", "INVALID_CONFIG")
            return
        }
        val packages = call.getArray("packages")?.toList<String>()?.toSet() ?: emptySet()
        CapturePrefs.write(
            context,
            CaptureConfig(call.getBoolean("enabled", true) == true, baseUrl, token, packages),
        )
        call.resolve(statusObject())
    }

    @PluginMethod
    fun status(call: PluginCall) = call.resolve(statusObject())

    /** Opens the system screen where the user grants "notification access" to the app. */
    @PluginMethod
    fun openSettings(call: PluginCall) {
        val intent = Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        context.startActivity(intent)
        call.resolve()
    }

    /** Stops the capture and forgets the token. */
    @PluginMethod
    fun clear(call: PluginCall) {
        CapturePrefs.clear(context)
        call.resolve(statusObject())
    }
}
