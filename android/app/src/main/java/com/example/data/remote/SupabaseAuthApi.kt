package com.example.data.remote

import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.Header
import retrofit2.http.POST
import retrofit2.http.Query

/**
 * A thin client for Supabase's GoTrue REST API — the same "auth only, not the
 * full SDK" approach the web app takes in web/src/lib/supabase.ts. Retrofit,
 * Moshi and OkHttp are already on the classpath for the backend API, so this
 * avoids pulling in the full supabase-kt stack for three endpoints.
 *
 * Base URL: {SUPABASE_URL}/auth/v1/
 */
interface SupabaseAuthApi {

    /**
     * `redirect_to` is where the link in the confirmation email lands. Leave it
     * out and Supabase uses the project's Site URL, which is a dashboard
     * setting -- not something a published app should depend on to let a new
     * user activate their account.
     */
    @POST("signup")
    suspend fun signUp(
        @Query("redirect_to") redirectTo: String,
        @Body body: SignUpRequest,
    ): Response<SupabaseSessionDto>

    @POST("token")
    suspend fun signInWithPassword(
        @Query("grant_type") grantType: String = "password",
        @Body body: SignInRequest
    ): Response<SupabaseSessionDto>

    @POST("token")
    suspend fun refreshToken(
        @Query("grant_type") grantType: String = "refresh_token",
        @Body body: RefreshRequest
    ): Response<SupabaseSessionDto>

    /**
     * Starts a password reset. Supabase answers 200 whether or not the address
     * has an account, which is the right behaviour -- telling an app which
     * addresses are registered hands over a list of who to go after.
     *
     * `redirect_to` is where the link in the email lands: the website, which
     * has a page for setting a new password. A phone browser cannot hand a
     * session back to this app, so the person sets the password there and
     * returns here to sign in with it.
     */
    @POST("recover")
    suspend fun recover(
        @Query("redirect_to") redirectTo: String,
        @Body body: RecoverRequest,
    ): Response<Unit>

    @POST("logout")
    suspend fun signOut(@Header("Authorization") bearer: String): Response<Unit>
}
