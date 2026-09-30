package com.example.data.remote

import com.squareup.moshi.JsonClass

/* -------------------------------------------------------------------------- */
/* Categories                                                                 */
/* -------------------------------------------------------------------------- */

@JsonClass(generateAdapter = true)
data class CategoryDto(
    val id: Int,
    val slug: String,
    val name: String,
    val icon: String? = null,
    val imageUrl: String? = null,
    val accentColor: String? = null,
    val parentId: Int? = null,
    val children: List<CategoryDto>? = null
)

/* -------------------------------------------------------------------------- */
/* Locations                                                                  */
/* -------------------------------------------------------------------------- */

@JsonClass(generateAdapter = true)
data class CountryDto(
    val id: Int,
    val code: String,
    val name: String,
    val dialCode: String,
    val flag: String? = null,
    val defaultCurrency: String? = null,
    val defaultLanguage: String? = null,
    val phoneLength: Int? = null
)

@JsonClass(generateAdapter = true)
data class PlaceDto(
    val id: Int,
    val name: String,
    val latitude: Double? = null,
    val longitude: Double? = null,
    val isMajor: Boolean? = null
)

/* -------------------------------------------------------------------------- */
/* Products                                                                   */
/* -------------------------------------------------------------------------- */

@JsonClass(generateAdapter = true)
data class SellerRefDto(
    val id: String,
    val name: String,
    val avatarUrl: String? = null,
    val verified: Boolean = false
)

@JsonClass(generateAdapter = true)
data class BusinessRefDto(
    val id: String,
    val name: String? = null
)

@JsonClass(generateAdapter = true)
data class ProductImageDto(
    val id: String,
    val url: String,
    val thumbnailUrl: String? = null,
    val width: Int? = null,
    val height: Int? = null,
    val position: Int = 0,
    val isPrimary: Boolean = false,
    /** "image" or "video". A listing may carry one video alongside its photos. */
    val mediaType: String = "image",
    val durationSeconds: Int? = null
)

@JsonClass(generateAdapter = true)
data class ProductCardDto(
    val id: String,
    val ref: Int,
    val slug: String,
    val title: String,
    val price: Double,
    val currency: String,
    val negotiable: Boolean,
    val condition: String,
    val city: String? = null,
    val cityId: Int? = null,
    val countryCode: String? = null,
    val distanceKm: Double? = null,
    val thumbnailUrl: String? = null,
    val imageUrl: String? = null,
    val imageCount: Int = 0,
    /** The card shows a badge; the video itself is only fetched on the listing. */
    val hasVideo: Boolean = false,
    val videoUrl: String? = null,
    val videoPosterUrl: String? = null,
    val videoDurationSeconds: Int? = null,
    val viewCount: Int = 0,
    val favoriteCount: Int = 0,
    val featured: Boolean = false,
    val deliveryAvailable: Boolean = false,
    val publishedAt: String? = null,
    val seller: SellerRefDto,
    val business: BusinessRefDto? = null,
    val isFavorited: Boolean? = null
)

@JsonClass(generateAdapter = true)
data class ProductDetailDto(
    val id: String,
    val ref: Int,
    val slug: String,
    val title: String,
    val price: Double,
    val currency: String,
    val negotiable: Boolean,
    val condition: String,
    val city: String? = null,
    val cityId: Int? = null,
    val countryCode: String? = null,
    val distanceKm: Double? = null,
    val thumbnailUrl: String? = null,
    val imageUrl: String? = null,
    val imageCount: Int = 0,
    val hasVideo: Boolean = false,
    val viewCount: Int = 0,
    val favoriteCount: Int = 0,
    val featured: Boolean = false,
    val deliveryAvailable: Boolean = false,
    val publishedAt: String? = null,
    val seller: SellerRefDto,
    val business: BusinessRefDto? = null,
    val isFavorited: Boolean? = null,
    val description: String? = null,
    val categoryId: Int,
    val subcategoryId: Int? = null,
    val regionId: Int? = null,
    val districtId: Int? = null,
    val neighborhoodId: Int? = null,
    val latitude: Double? = null,
    val longitude: Double? = null,
    val brand: String? = null,
    val model: String? = null,
    val year: Int? = null,
    val color: String? = null,
    val size: String? = null,
    val quantity: Int = 0,
    val attributes: Map<String, Any?>? = null,
    val status: String? = null,
    val expiresAt: String? = null,
    val soldAt: String? = null,
    val createdAt: String? = null,
    val images: List<ProductImageDto>? = null,
    val contact: ContactDto? = null,
    val shareUrl: String? = null
)

@JsonClass(generateAdapter = true)
data class ContactDto(
    val phone: String? = null,
    val whatsapp: String? = null
)

/* -------------------------------------------------------------------------- */
/* Users                                                                      */
/* -------------------------------------------------------------------------- */

@JsonClass(generateAdapter = true)
data class ProfileDto(
    val id: String,
    val username: String? = null,
    val fullName: String? = null,
    val avatarUrl: String? = null,
    val bio: String? = null,
    val language: String? = null,
    val currency: String? = null,
    val phone: String? = null,
    val whatsapp: String? = null,
    val role: String? = null
)
