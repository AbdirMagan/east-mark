package com.example.data.session

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.core.longPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch

private val Context.authDataStore by preferencesDataStore(name = "em_auth")

data class Session(
    val accessToken: String,
    val refreshToken: String,
    /** Epoch millis. */
    val expiresAt: Long,
    val userId: String,
    val email: String?
) {
    val isExpiringSoon: Boolean
        get() = System.currentTimeMillis() >= expiresAt - EXPIRY_LEEWAY_MS

    companion object {
        private const val EXPIRY_LEEWAY_MS = 60_000L
    }
}

/**
 * Persists the Supabase session to DataStore and mirrors it in an in-memory
 * StateFlow so the OkHttp interceptor can read the current token
 * synchronously, without a runBlocking hop into DataStore on every request.
 */
class SessionManager(private val context: Context) {

    private object Keys {
        val ACCESS_TOKEN = stringPreferencesKey("access_token")
        val REFRESH_TOKEN = stringPreferencesKey("refresh_token")
        val EXPIRES_AT = longPreferencesKey("expires_at")
        val USER_ID = stringPreferencesKey("user_id")
        val EMAIL = stringPreferencesKey("email")
    }

    private val _session = MutableStateFlow<Session?>(null)
    val session: StateFlow<Session?> = _session

    /** True once the persisted session has been read at least once. */
    private val _ready = MutableStateFlow(false)
    val ready: StateFlow<Boolean> = _ready

    init {
        CoroutineScope(Dispatchers.IO).launch {
            val prefs = context.authDataStore.data.first()
            val access = prefs[Keys.ACCESS_TOKEN]
            val refresh = prefs[Keys.REFRESH_TOKEN]
            val expiresAt = prefs[Keys.EXPIRES_AT]
            val userId = prefs[Keys.USER_ID]
            if (access != null && refresh != null && expiresAt != null && userId != null) {
                _session.value = Session(access, refresh, expiresAt, userId, prefs[Keys.EMAIL])
            }
            _ready.value = true
        }
    }

    suspend fun save(session: Session) {
        _session.value = session
        context.authDataStore.edit { prefs ->
            prefs[Keys.ACCESS_TOKEN] = session.accessToken
            prefs[Keys.REFRESH_TOKEN] = session.refreshToken
            prefs[Keys.EXPIRES_AT] = session.expiresAt
            prefs[Keys.USER_ID] = session.userId
            if (session.email != null) prefs[Keys.EMAIL] = session.email
        }
    }

    suspend fun clear() {
        _session.value = null
        context.authDataStore.edit { it.clear() }
    }

    /** Synchronous read for the OkHttp interceptor. */
    fun currentAccessToken(): String? = _session.value?.accessToken
}
