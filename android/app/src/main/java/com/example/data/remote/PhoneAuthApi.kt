package com.example.data.remote

import com.squareup.moshi.JsonClass
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.POST

/**
 * Signing up and signing in with a phone number.
 *
 * These two calls go to the marketplace's own API rather than to Supabase,
 * because the address a phone account is held under is derived with a secret
 * that lives on the server. What comes back is an ordinary Supabase session,
 * stored and refreshed exactly like one from an email sign-in.
 *
 * Deliberately its own interface, built without the authenticating client:
 * BackendApi is constructed with an AuthRepository to refresh tokens, and
 * AuthRepository cannot hold a BackendApi without the two needing each other
 * to exist first. Neither of these calls is authenticated anyway.
 */
interface PhoneAuthApi {

    @POST("auth/phone/register")
    suspend fun register(@Body body: PhoneRegisterRequest): Response<ApiEnvelope<PhoneSessionDto>>

    @POST("auth/phone/sign-in")
    suspend fun signIn(@Body body: PhoneSignInRequest): Response<ApiEnvelope<PhoneSessionDto>>
}

@JsonClass(generateAdapter = true)
data class PhoneRegisterRequest(
    val phone: String,
    /** The country's dial code in digits, e.g. "252". */
    val dialCode: String,
    val password: String,
    val fullName: String,
    val languageCode: String? = null
)

@JsonClass(generateAdapter = true)
data class PhoneSignInRequest(
    val phone: String,
    val dialCode: String,
    val password: String
)

@JsonClass(generateAdapter = true)
data class PhoneSessionDto(
    val accessToken: String,
    val refreshToken: String,
    /** Epoch seconds, or null when the server did not say. */
    val expiresAt: Long?,
    val userId: String,
    /** The number as stored, in E.164. */
    val phone: String
)
