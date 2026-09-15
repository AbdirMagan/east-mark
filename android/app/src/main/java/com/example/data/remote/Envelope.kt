package com.example.data.remote

import com.squareup.moshi.Json
import com.squareup.moshi.JsonClass

/**
 * Matches the backend's response envelope exactly (see backend/src/lib/api.ts
 * on the web side, and backend/src/utils/response.ts on the server).
 */
@JsonClass(generateAdapter = true)
data class ApiEnvelope<T>(
    val success: Boolean,
    val data: T?,
    val message: String? = null,
    val meta: PageMetaDto? = null,
    val code: String? = null,
    val errors: Map<String, List<String>>? = null,
    val requestId: String? = null
)

@JsonClass(generateAdapter = true)
data class PageMetaDto(
    val page: Int,
    val limit: Int,
    val total: Int,
    val totalPages: Int,
    val hasMore: Boolean
)

/** Thrown when the backend returns success:false, or the call fails outright. */
class ApiException(
    message: String,
    val status: Int = 0,
    val code: String? = null
) : Exception(message)
