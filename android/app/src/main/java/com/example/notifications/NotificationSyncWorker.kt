package com.example.notifications

import android.Manifest
import android.annotation.SuppressLint
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import androidx.work.Constraints
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.NetworkType
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import com.example.MainActivity
import com.example.R
import com.example.data.local.AppDatabase
import com.example.data.remote.NetworkModule
import com.example.data.repository.AuthRepository
import com.example.data.repository.MarketplaceRepository
import com.example.data.session.SessionManager
import java.util.concurrent.TimeUnit

/**
 * Notifications that arrive while the app is shut.
 *
 * There is no Firebase project behind this app, so nothing can wake it from
 * outside. Instead it asks: every fifteen minutes, on a connection, WorkManager
 * runs this, fetches anything unread it has not already shown, and raises a
 * system notification for it.
 *
 * The trade is honesty about latency. A real push arrives in a second; this
 * arrives within the quarter hour Android is willing to schedule, and later
 * than that when the phone is in Doze. For "your listing was approved" and
 * "someone replied about the Corolla" that is the right trade against asking
 * someone to set up Firebase before the app works at all. The web app and the
 * Expo app both take a real push, so the plumbing to add FCM here later is a
 * sender, not a redesign -- see push.service.ts.
 *
 * Shown ids are remembered in preferences so a notification is raised once,
 * not once per run until it is read.
 */
class NotificationSyncWorker(
    context: Context,
    parameters: WorkerParameters
) : CoroutineWorker(context, parameters) {

    override suspend fun doWork(): Result {
        val repository = buildRepository(applicationContext)

        val refreshed = repository.refreshNotifications()
        if (refreshed.isFailure) {
            // Signed out, or the network moved under us. Neither is worth a
            // retry storm; the next scheduled run will pick it up.
            return Result.success()
        }

        val unread = repository.notifications.value.filter { !it.read }
        if (unread.isEmpty()) return Result.success()

        val preferences = applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        val alreadyShown = preferences.getStringSet(KEY_SHOWN, emptySet()).orEmpty()

        val fresh = unread.filter { it.id !in alreadyShown }
        if (fresh.isNotEmpty()) {
            ensureChannel(applicationContext)
            fresh.forEach { notification ->
                show(
                    context = applicationContext,
                    id = notification.id,
                    title = notification.title,
                    body = notification.body,
                    conversationId = notification.conversationId,
                    productId = notification.productId
                )
            }
        }

        // Keep only ids that are still unread, so the set cannot grow forever
        // and a notification read on another device can be shown again if it
        // somehow comes back unread.
        preferences.edit().putStringSet(KEY_SHOWN, unread.map { it.id }.toSet()).apply()
        return Result.success()
    }

    private fun buildRepository(context: Context): MarketplaceRepository {
        val moshi = NetworkModule.provideMoshi()
        val sessionManager = SessionManager(context)
        val authApi = NetworkModule.provideAuthApi(sessionManager, moshi)
        val authRepository = AuthRepository(authApi, sessionManager, moshi)
        val backendApi = NetworkModule.provideBackendApi(sessionManager, authRepository, moshi)
        return MarketplaceRepository(AppDatabase.getDatabase(context), backendApi, authRepository)
    }

    companion object {
        const val CHANNEL_ID = "magan_market_default"
        const val WORK_NAME = "notification-sync"
        private const val PREFS = "notifications"
        private const val KEY_SHOWN = "shown_ids"

        /** Fifteen minutes is the floor Android allows for periodic work. */
        fun schedule(context: Context) {
            val request = PeriodicWorkRequestBuilder<NotificationSyncWorker>(15, TimeUnit.MINUTES)
                .setConstraints(
                    Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build()
                )
                .build()

            WorkManager.getInstance(context).enqueueUniquePeriodicWork(
                WORK_NAME,
                // KEEP, not UPDATE: re-enqueueing on every launch would reset
                // the period and a frequently opened app would never run it.
                ExistingPeriodicWorkPolicy.KEEP,
                request
            )
        }

        fun ensureChannel(context: Context) {
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
            val manager = context.getSystemService(NotificationManager::class.java) ?: return
            if (manager.getNotificationChannel(CHANNEL_ID) != null) return
            manager.createNotificationChannel(
                NotificationChannel(
                    CHANNEL_ID,
                    context.getString(R.string.notification_channel_name),
                    NotificationManager.IMPORTANCE_DEFAULT
                ).apply {
                    description = context.getString(R.string.notification_channel_description)
                }
            )
        }

        /**
         * Raises one notification. A tap opens the app at whatever it is
         * about; the extras are read by MainActivity.
         */
        @SuppressLint("MissingPermission")
        fun show(
            context: Context,
            id: String,
            title: String,
            body: String,
            conversationId: String?,
            productId: String?
        ) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
                ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) !=
                PackageManager.PERMISSION_GRANTED
            ) {
                // Android 13 and up: without the runtime permission this would
                // be dropped silently anyway.
                return
            }

            val intent = Intent(context, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
                putExtra(EXTRA_NOTIFICATION_ID, id)
                conversationId?.let { putExtra(EXTRA_CONVERSATION_ID, it) }
                productId?.let { putExtra(EXTRA_PRODUCT_ID, it) }
            }

            val pending = PendingIntent.getActivity(
                context,
                id.hashCode(),
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )

            val notification = NotificationCompat.Builder(context, CHANNEL_ID)
                .setSmallIcon(R.drawable.ic_stat_notification)
                .setContentTitle(title)
                .setContentText(body)
                .setStyle(NotificationCompat.BigTextStyle().bigText(body))
                .setPriority(NotificationCompat.PRIORITY_DEFAULT)
                .setAutoCancel(true)
                .setContentIntent(pending)
                .build()

            NotificationManagerCompat.from(context).notify(id.hashCode(), notification)
        }

        const val EXTRA_NOTIFICATION_ID = "notification_id"
        const val EXTRA_CONVERSATION_ID = "conversation_id"
        const val EXTRA_PRODUCT_ID = "product_id"
    }
}
