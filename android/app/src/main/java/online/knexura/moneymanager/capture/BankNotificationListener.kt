package online.knexura.moneymanager.capture

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import androidx.core.app.NotificationCompat
import online.knexura.moneymanager.MainActivity
import online.knexura.moneymanager.R
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.Executors

/**
 * Reads notifications from the configured bank apps, keeps only the ones that look like a
 * transaction and sends that text to the API, which stores it as a pending movement. Nothing is
 * recorded or deducted until the user confirms it in the app.
 *
 * Privacy: notifications from any other app, and our own, are discarded on the device and never
 * leave it.
 */
class BankNotificationListener : NotificationListenerService() {
    private val executor = Executors.newSingleThreadExecutor()

    // Same alert seen twice in a short time (bank apps often re-post): sent once.
    private val seen = object : LinkedHashMap<String, Long>(64, 0.75f, true) {
        override fun removeEldestEntry(eldest: MutableMap.MutableEntry<String, Long>?) = size > 64
    }

    override fun onNotificationPosted(sbn: StatusBarNotification) {
        val config = CapturePrefs.read(this) ?: return
        if (!config.enabled || sbn.packageName == packageName || sbn.packageName !in config.packages) return
        val notification = sbn.notification ?: return
        if (notification.flags and Notification.FLAG_GROUP_SUMMARY != 0) return

        val extras = notification.extras
        val text = listOf(
            extras.getCharSequence(Notification.EXTRA_TITLE),
            extras.getCharSequence(Notification.EXTRA_BIG_TEXT) ?: extras.getCharSequence(Notification.EXTRA_TEXT),
        ).filterNotNull().joinToString(" ").replace(Regex("\\s+"), " ").trim()
        if (!looksLikeTransaction(text)) return

        val now = System.currentTimeMillis()
        synchronized(seen) {
            val key = text.hashCode().toString()
            val last = seen[key]
            if (last != null && now - last < DEDUPE_MS) return
            seen[key] = now
        }
        executor.execute { deliver(config, text.take(MAX_TEXT)) }
    }

    private fun deliver(config: CaptureConfig, text: String) {
        when (post(config, text)) {
            Result.CREATED -> {
                notifyPending()
                // The connection works: retry what could not be sent earlier.
                CapturePrefs.drainQueue(this).forEach { queued ->
                    if (post(config, queued) == Result.RETRY) CapturePrefs.enqueue(this, queued)
                }
            }
            Result.DUPLICATE -> Unit
            Result.RETRY -> CapturePrefs.enqueue(this, text)
            Result.REVOKED -> {
                // The token was revoked from the app: stop capturing until it is set up again.
                CapturePrefs.disable(this)
            }
        }
    }

    private enum class Result { CREATED, DUPLICATE, RETRY, REVOKED }

    private fun post(config: CaptureConfig, text: String): Result {
        var connection: HttpURLConnection? = null
        return try {
            connection = (URL(config.baseUrl.trimEnd('/') + "/pending-registers/ingest").openConnection() as HttpURLConnection).apply {
                requestMethod = "POST"
                connectTimeout = 10_000
                readTimeout = 15_000
                doOutput = true
                setRequestProperty("Content-Type", "application/json; charset=utf-8")
                setRequestProperty("Authorization", "Bearer ${config.token}")
            }
            val body = JSONObject().put("text", text).put("source", "android").toString()
            connection.outputStream.use { it.write(body.toByteArray(Charsets.UTF_8)) }
            when (connection.responseCode) {
                201 -> Result.CREATED
                200 -> Result.DUPLICATE
                401 -> Result.REVOKED
                // 422: not a recognizable alert; 400/429: nothing to retry or too many alerts.
                422, 400, 429 -> Result.DUPLICATE
                else -> Result.RETRY
            }
        } catch (e: Exception) {
            Result.RETRY
        } finally {
            connection?.disconnect()
        }
    }

    private fun notifyPending() {
        val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            manager.createNotificationChannel(
                NotificationChannel(CHANNEL_ID, getString(R.string.capture_channel_name), NotificationManager.IMPORTANCE_DEFAULT)
            )
        }
        val open = PendingIntent.getActivity(
            this,
            0,
            Intent(this, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
        )
        val notification = NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_stat_notify)
            .setContentTitle(getString(R.string.capture_notification_title))
            .setContentText(getString(R.string.capture_notification_text))
            .setContentIntent(open)
            .setAutoCancel(true)
            .build()
        try {
            manager.notify(NOTIFICATION_ID, notification)
        } catch (e: SecurityException) {
            // Notification permission not granted: the pending item is still waiting in the app.
        }
    }

    companion object {
        private const val CHANNEL_ID = "pending_captures"
        private const val NOTIFICATION_ID = 7301
        private const val DEDUPE_MS = 10 * 60 * 1000L
        private const val MAX_TEXT = 1000

        private val AMOUNT = Regex("(\\$\\s?\\d|\\bCOP\\b)", RegexOption.IGNORE_CASE)
        private val ACTION = Regex(
            "(compra|compraste|pagaste|pago|retiro|retiraste|enviaste|transferiste|recibiste|recibi[oó]|abono|consignaci[oó]n|dep[oó]sito|n[oó]mina|d[eé]bito|cargo)",
            RegexOption.IGNORE_CASE,
        )

        /** Cheap on-device filter: an amount and a movement word. The server parses the rest. */
        fun looksLikeTransaction(text: String) =
            text.length >= 8 && AMOUNT.containsMatchIn(text) && ACTION.containsMatchIn(text)
    }
}
