package com.example.data.repository

import com.example.BuildConfig
import com.example.data.remote.RecoverRequest
import com.example.data.remote.RefreshRequest
import com.example.data.remote.SignInRequest
import com.example.data.remote.SignUpRequest
import com.example.data.remote.SupabaseAuthApi
import com.example.data.remote.SupabaseErrorDto
import com.example.data.remote.SupabaseSessionDto
import com.example.data.session.Session
import com.example.data.remote.ApiEnvelope
import com.example.data.remote.PhoneAuthApi
import com.example.data.remote.PhoneRegisterRequest
import com.example.data.remote.PhoneSessionDto
import com.example.data.remote.PhoneSignInRequest
import com.example.data.session.SessionManager
import org.json.JSONObject
import com.squareup.moshi.Moshi
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import retrofit2.Response

sealed interface AuthState {
    object Loading : AuthState
    object SignedOut : AuthState
    data class SignedIn(val userId: String, val email: String?) : AuthState
}

/**
 * Wraps Supabase's GoTrue REST API (see SupabaseAuthApi) and persists the
 * resulting session via SessionManager. This mirrors what web/src/lib/supabase.ts
 * does with @supabase/auth-js, minus the JS SDK.
 */
class AuthRepository(
    private val api: SupabaseAuthApi,
    private val sessionManager: SessionManager,
    private val moshi: Moshi,
    private val phoneApi: PhoneAuthApi? = null
) {
    private val refreshMutex = Mutex()

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)

    private val _authState = MutableStateFlow<AuthState>(AuthState.Loading)
    val authState: StateFlow<AuthState> = _authState

    init {
        // Reflects whatever SessionManager loads from disk once it's ready,
        // and every session change after that (sign in, sign out, refresh).
        scope.launch {
            combine(sessionManager.ready, sessionManager.session) { ready, session -> ready to session }
                .collect { (ready, session) ->
                    if (!ready) return@collect
                    _authState.value = if (session != null) {
                        AuthState.SignedIn(session.userId, session.email)
                    } else {
                        AuthState.SignedOut
                    }
                }
        }
    }

    suspend fun signUp(email: String, password: String, fullName: String? = null): Result<Unit> = runCatching {
        val response = api.signUp(
            redirectTo = BuildConfig.WEB_BASE_URL + "/auth/confirmed",
            body = SignUpRequest(
                email,
                password,
                fullName?.trim()?.takeIf { it.isNotEmpty() }?.let { mapOf("full_name" to it) },
            ),
        )
        if (!response.isSuccessful) throw AuthException(errorMessage(response))
        val body = response.body()
        if (body?.access_token != null) {
            persist(body)
        }
        // else: email confirmation required by the project; there is no
        // session yet and that's expected, not an error.
    }

    /**
     * Asks Supabase to email a password-reset link.
     *
     * Succeeds whether or not the address has an account, and the screen says
     * the same either way: a form that reveals which addresses are registered
     * is the first half of an attack on the people behind them.
     */
    suspend fun requestPasswordReset(email: String): Result<Unit> = runCatching {
        val response = api.recover(
            redirectTo = BuildConfig.WEB_BASE_URL + "/reset-password",
            body = RecoverRequest(email),
        )
        if (!response.isSuccessful) throw AuthException(errorMessage(response))
    }

    suspend fun signIn(email: String, password: String): Result<Unit> = runCatching {
        val response = api.signInWithPassword(body = SignInRequest(email, password))
        if (!response.isSuccessful) throw AuthException(errorMessage(response))
        val body = response.body() ?: throw AuthException("Sign in failed")
        persist(body)
    }

    /**
     * Phone number and password, through the marketplace's own API.
     *
     * No code is sent and none is asked for: there is no SMS provider behind
     * this project, so the number is a credential rather than something to
     * verify. The session that comes back is a Supabase one and is stored the
     * same way as any other.
     */
    suspend fun signInWithPhone(phone: String, dialCode: String, password: String): Result<Unit> =
        runCatching {
            val client = phoneApi ?: throw AuthException("Phone sign-in is unavailable")
            val response = client.signIn(PhoneSignInRequest(phone.trim(), dialCode, password))
            persistPhone(response)
        }

    suspend fun signUpWithPhone(
        phone: String,
        dialCode: String,
        password: String,
        fullName: String,
        languageCode: String? = null
    ): Result<Unit> = runCatching {
        val client = phoneApi ?: throw AuthException("Phone sign-up is unavailable")
        val response = client.register(
            PhoneRegisterRequest(phone.trim(), dialCode, password, fullName.trim(), languageCode)
        )
        persistPhone(response)
    }

    private suspend fun persistPhone(response: Response<ApiEnvelope<PhoneSessionDto>>) {
        if (!response.isSuccessful) throw AuthException(backendError(response))
        val session = response.body()?.data ?: throw AuthException("Sign in failed")
        sessionManager.save(
            Session(
                accessToken = session.accessToken,
                refreshToken = session.refreshToken,
                // The API reports an absolute epoch second; the rest of this
                // class works in millis.
                expiresAt = session.expiresAt?.times(1000)
                    ?: (System.currentTimeMillis() + 3_600_000),
                userId = session.userId,
                // There is no address to show. The number is what this person
                // signs in with, so that is what the profile screen shows.
                email = session.phone
            )
        )
    }

    /** The API's own message ("Wrong phone number or password") where there is one. */
    private fun backendError(response: Response<*>): String {
        val raw = response.errorBody()?.string()
        val message = raw?.let {
            runCatching { JSONObject(it).optString("message") }.getOrNull()
        }
        return message?.takeIf { it.isNotBlank() } ?: "Something went wrong (${response.code()})"
    }

    suspend fun signOut() {
        val token = sessionManager.currentAccessToken()
        sessionManager.clear()
        if (token != null) {
            runCatching { api.signOut("Bearer $token") }
        }
    }

    /** Refreshes the access token if it's missing or close to expiry. Returns the token to use, if any. */
    suspend fun refreshIfNeeded(): String? = refreshMutex.withLock {
        val current = sessionManager.session.value ?: return null
        if (!current.isExpiringSoon) return current.accessToken

        val response = runCatching {
            api.refreshToken(body = RefreshRequest(current.refreshToken))
        }.getOrNull()

        val body = response?.takeIf { it.isSuccessful }?.body()
        return if (body?.access_token != null) {
            persist(body)
            body.access_token
        } else {
            // The refresh token is dead too; sign the user out locally.
            sessionManager.clear()
            null
        }
    }

    private suspend fun persist(body: SupabaseSessionDto) {
        val access = body.access_token ?: return
        val refresh = body.refresh_token ?: return
        val expiresInSeconds = body.expires_in ?: 3600
        sessionManager.save(
            Session(
                accessToken = access,
                refreshToken = refresh,
                expiresAt = System.currentTimeMillis() + expiresInSeconds * 1000,
                userId = body.user?.id.orEmpty(),
                email = body.user?.email
            )
        )
    }

    private fun errorMessage(response: Response<*>): String {
        val raw = response.errorBody()?.string()
        val parsed = raw?.let { runCatching { moshi.adapter(SupabaseErrorDto::class.java).fromJson(it) }.getOrNull() }
        return parsed?.readableMessage() ?: "Something went wrong (${response.code()})"
    }
}

class AuthException(message: String) : Exception(message)
