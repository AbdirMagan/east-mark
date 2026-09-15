package com.example.data.remote

import com.example.BuildConfig
import com.example.data.repository.AuthRepository
import com.example.data.session.SessionManager
import com.squareup.moshi.Moshi
import kotlinx.coroutines.runBlocking
import okhttp3.Authenticator
import okhttp3.Interceptor
import okhttp3.OkHttpClient
import okhttp3.Route
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.moshi.MoshiConverterFactory
import java.util.concurrent.TimeUnit

/**
 * Builds the Retrofit clients for Supabase Auth and the East-Market backend.
 * No DI framework is used elsewhere in this app, so this is wired by hand,
 * the same way AppDatabase.getDatabase(application) is.
 */
object NetworkModule {

    fun provideMoshi(): Moshi = Moshi.Builder().build()

    private fun loggingInterceptor(): HttpLoggingInterceptor =
        HttpLoggingInterceptor().apply {
            level = if (BuildConfig.DEBUG) {
                HttpLoggingInterceptor.Level.BASIC
            } else {
                HttpLoggingInterceptor.Level.NONE
            }
        }

    /** Supabase's GoTrue REST API. Every call needs the project's apikey header. */
    fun provideAuthApi(sessionManager: SessionManager, moshi: Moshi): SupabaseAuthApi {
        val client = OkHttpClient.Builder()
            .addInterceptor { chain ->
                val request = chain.request().newBuilder()
                    .header("apikey", BuildConfig.SUPABASE_ANON_KEY)
                    .header(
                        "Authorization",
                        "Bearer ${sessionManager.currentAccessToken() ?: BuildConfig.SUPABASE_ANON_KEY}"
                    )
                    .build()
                chain.proceed(request)
            }
            .addInterceptor(loggingInterceptor())
            .connectTimeout(15, TimeUnit.SECONDS)
            .readTimeout(15, TimeUnit.SECONDS)
            .build()

        return Retrofit.Builder()
            .baseUrl("${BuildConfig.SUPABASE_URL}/auth/v1/")
            .client(client)
            .addConverterFactory(MoshiConverterFactory.create(moshi))
            .build()
            .create(SupabaseAuthApi::class.java)
    }

    /**
     * The backend API. Attaches the caller's access token when signed in
     * (optionalAuth routes work fine without one) and refreshes it once on a
     * 401 before giving up, via the Authenticator below.
     */
    fun provideBackendApi(
        sessionManager: SessionManager,
        authRepository: AuthRepository,
        moshi: Moshi
    ): BackendApi {
        val authInterceptor = Interceptor { chain ->
            val token = sessionManager.currentAccessToken()
            val request = if (token != null) {
                chain.request().newBuilder().header("Authorization", "Bearer $token").build()
            } else {
                chain.request()
            }
            chain.proceed(request)
        }

        val authenticator = Authenticator { _: Route?, response ->
            if (response.request.header("Authorization") == null) return@Authenticator null
            if (responseCount(response) >= 2) return@Authenticator null

            val newToken = runBlocking { authRepository.refreshIfNeeded() } ?: return@Authenticator null
            response.request.newBuilder().header("Authorization", "Bearer $newToken").build()
        }

        val client = OkHttpClient.Builder()
            .addInterceptor(authInterceptor)
            .authenticator(authenticator)
            .addInterceptor(loggingInterceptor())
            .connectTimeout(15, TimeUnit.SECONDS)
            .readTimeout(15, TimeUnit.SECONDS)
            .build()

        val baseUrl = BuildConfig.API_BASE_URL.let { if (it.endsWith("/")) it else "$it/" }

        return Retrofit.Builder()
            .baseUrl(baseUrl)
            .client(client)
            .addConverterFactory(MoshiConverterFactory.create(moshi))
            .build()
            .create(BackendApi::class.java)
    }

    private fun responseCount(response: okhttp3.Response): Int {
        var result = 1
        var prior = response.priorResponse
        while (prior != null) {
            result++
            prior = prior.priorResponse
        }
        return result
    }
}
