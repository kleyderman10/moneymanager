package online.knexura.moneymanager.capture

import android.content.Context

/**
 * Configuration of the bank-notification capture, kept in app-private storage (backups are
 * disabled for this app). The token can only push alerts to the "Por confirmar" inbox and can be
 * revoked from the app, so it is not a login credential.
 */
data class CaptureConfig(
    val enabled: Boolean,
    val baseUrl: String,
    val token: String,
    val packages: Set<String>,
)

object CapturePrefs {
    private const val FILE = "capture_prefs"
    private const val QUEUE_LIMIT = 10

    private fun prefs(context: Context) =
        context.applicationContext.getSharedPreferences(FILE, Context.MODE_PRIVATE)

    fun read(context: Context): CaptureConfig? {
        val p = prefs(context)
        val baseUrl = p.getString("baseUrl", null) ?: return null
        val token = p.getString("token", null) ?: return null
        return CaptureConfig(
            enabled = p.getBoolean("enabled", false),
            baseUrl = baseUrl,
            token = token,
            packages = p.getStringSet("packages", emptySet()) ?: emptySet(),
        )
    }

    fun write(context: Context, config: CaptureConfig) {
        prefs(context).edit()
            .putBoolean("enabled", config.enabled)
            .putString("baseUrl", config.baseUrl)
            .putString("token", config.token)
            .putStringSet("packages", config.packages)
            .apply()
    }

    fun clear(context: Context) {
        prefs(context).edit().clear().apply()
    }

    fun disable(context: Context) {
        prefs(context).edit().putBoolean("enabled", false).remove("token").apply()
    }

    /** Alerts that could not be sent (no connection); retried on the next successful send. */
    @Synchronized
    fun enqueue(context: Context, text: String) {
        val p = prefs(context)
        val queue = (p.getStringSet("queue", emptySet()) ?: emptySet()).toMutableSet()
        if (queue.size >= QUEUE_LIMIT) return
        queue.add(text)
        p.edit().putStringSet("queue", queue).apply()
    }

    @Synchronized
    fun drainQueue(context: Context): List<String> {
        val p = prefs(context)
        val queue = (p.getStringSet("queue", emptySet()) ?: emptySet()).toList()
        if (queue.isNotEmpty()) p.edit().remove("queue").apply()
        return queue
    }
}
