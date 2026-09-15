package com.example.data.remote

import com.squareup.moshi.JsonClass

/* -------------------------------------------------------------------------- */
/* Requests                                                                   */
/* -------------------------------------------------------------------------- */

@JsonClass(generateAdapter = true)
data class SignUpRequest(val email: String, val password: String)

@JsonClass(generateAdapter = true)
data class SignInRequest(val email: String, val password: String)

@JsonClass(generateAdapter = true)
data class RefreshRequest(val refresh_token: String)

/* -------------------------------------------------------------------------- */
/* Responses (Supabase GoTrue / auth/v1)                                     */
/* -------------------------------------------------------------------------- */

@JsonClass(generateAdapter = true)
data class SupabaseSessionDto(
    val access_token: String? = null,
    val refresh_token: String? = null,
    val expires_in: Long? = null,
    val token_type: String? = null,
    val user: SupabaseUserDto? = null
)

@JsonClass(generateAdapter = true)
data class SupabaseUserDto(
    val id: String,
    val email: String? = null
)

/** Supabase returns a flat error shape, not the backend's envelope. */
@JsonClass(generateAdapter = true)
data class SupabaseErrorDto(
    val error: String? = null,
    val error_description: String? = null,
    val msg: String? = null,
    val message: String? = null,
    val code: String? = null
) {
    fun readableMessage(): String = error_description ?: msg ?: message ?: error ?: "Something went wrong"
}
