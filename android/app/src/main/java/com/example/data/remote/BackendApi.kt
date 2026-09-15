package com.example.data.remote

import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.PUT
import retrofit2.http.Path
import retrofit2.http.Query
import retrofit2.http.QueryMap

/**
 * The East-Market backend REST API (Node + Express), matching the shapes in
 * the backend's route handlers under backend/src/routes. Base URL:
 * {API_BASE_URL}/ (already includes /api/v1, see android/.env).
 */
interface BackendApi {

    /* Categories ------------------------------------------------------- */

    @GET("categories")
    suspend fun getCategories(@Query("lang") lang: String = "en"): ApiEnvelope<List<CategoryDto>>

    /* Locations ---------------------------------------------------------- */

    @GET("locations/countries")
    suspend fun getCountries(@Query("lang") lang: String = "en"): ApiEnvelope<List<CountryDto>>

    @GET("locations/cities")
    suspend fun getCities(
        @Query("countryId") countryId: Int? = null,
        @Query("major") major: Boolean? = null,
        @Query("q") query: String? = null,
        @Query("lang") lang: String = "en"
    ): ApiEnvelope<List<PlaceDto>>

    /* Products ------------------------------------------------------------ */

    @GET("products")
    suspend fun searchProducts(@QueryMap params: Map<String, String>): ApiEnvelope<List<ProductCardDto>>

    @GET("products/{id}")
    suspend fun getProduct(@Path("id") id: String): ApiEnvelope<ProductDetailDto>

    @POST("products/{id}/view")
    suspend fun recordView(
        @Path("id") id: String,
        @Body body: Map<String, String> = emptyMap()
    ): ApiEnvelope<Any?>

    /* Users / favorites ---------------------------------------------------- */

    @GET("users/me")
    suspend fun getMe(): ApiEnvelope<ProfileDto>

    @GET("users/me/favorites")
    suspend fun getFavorites(
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 50
    ): ApiEnvelope<List<ProductCardDto>>

    @PUT("users/me/favorites/{id}")
    suspend fun addFavorite(@Path("id") productId: String): ApiEnvelope<Any?>

    @DELETE("users/me/favorites/{id}")
    suspend fun removeFavorite(@Path("id") productId: String): ApiEnvelope<Any?>

    /* Promotions ----------------------------------------------------------- */

    @GET("ads")
    suspend fun getAds(
        @Query("placement") placement: String = "home_hero",
        @Query("lang") lang: String = "en",
        @Query("countryId") countryId: Int? = null
    ): ApiEnvelope<List<HomeAdDto>>

    @POST("ads/{id}/click")
    suspend fun recordAdClick(
        @Path("id") id: String,
        @Body body: Map<String, String> = emptyMap()
    ): ApiEnvelope<Any?>

    /* Messages ------------------------------------------------------------- */

    @GET("messages/conversations")
    suspend fun getConversations(): ApiEnvelope<List<ConversationSummaryDto>>

    @POST("messages/conversations")
    suspend fun startConversation(@Body body: StartConversationBody): ApiEnvelope<ConversationIdDto>

    @GET("messages/conversations/{id}/messages")
    suspend fun getMessages(
        @Path("id") id: String,
        @Query("before") before: String? = null,
        @Query("limit") limit: Int = 50
    ): ApiEnvelope<MessagePageDto>

    @POST("messages/conversations/{id}/messages")
    suspend fun sendMessage(
        @Path("id") id: String,
        @Body body: SendMessageBody
    ): ApiEnvelope<MessageDto>

    @POST("messages/conversations/{id}/read")
    suspend fun markConversationRead(
        @Path("id") id: String,
        @Body body: Map<String, String> = emptyMap()
    ): ApiEnvelope<Any?>

    @GET("messages/unread")
    suspend fun getUnread(): ApiEnvelope<UnreadDto>
}
