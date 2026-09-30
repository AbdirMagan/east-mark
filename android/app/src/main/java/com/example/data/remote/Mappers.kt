package com.example.data.remote

import com.example.data.model.CategoryItem
import com.example.data.model.ChatMessage
import com.example.data.model.Conversation
import com.example.data.model.HomeAd
import com.example.data.model.Country
import com.example.data.model.Product
import com.example.data.model.ProductCondition
import com.example.data.model.Seller
import java.text.SimpleDateFormat
import java.util.Locale
import java.util.TimeZone

/** Backend timestamps are ISO-8601 UTC (e.g. "2026-09-11T19:43:43.851976+00:00"). */
fun parseIsoToMillis(iso: String?): Long {
    if (iso == null) return System.currentTimeMillis()
    return runCatching {
        val trimmed = if (iso.length > 19) iso.substring(0, 19) else iso
        val format = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.US).apply {
            timeZone = TimeZone.getTimeZone("UTC")
        }
        format.parse(trimmed)?.time ?: System.currentTimeMillis()
    }.getOrDefault(System.currentTimeMillis())
}

fun conditionFromKey(key: String): ProductCondition =
    ProductCondition.entries.firstOrNull { it.key == key } ?: ProductCondition.USED

fun CategoryDto.toDomain(): CategoryItem = CategoryItem(
    id = id.toString(),
    name = name,
    iconName = icon ?: slug,
    subcategories = children?.map { it.name } ?: emptyList()
)

fun CountryDto.toDomain(cities: List<String>): Country = Country(
    id = id.toString(),
    name = name,
    flag = flag ?: code.countryCodeToFlagEmoji(),
    defaultCurrency = defaultCurrency ?: "USD",
    phonePrefix = dialCode,
    cities = cities
)

/** Best-effort flag emoji from a 2-letter ISO code, for countries missing one in the DB. */
private fun String.countryCodeToFlagEmoji(): String {
    if (length != 2) return "🏳️"
    val base = 0x1F1E6
    return runCatching {
        val chars = uppercase().map { base + (it - 'A') }
        String(Character.toChars(chars[0])) + String(Character.toChars(chars[1]))
    }.getOrDefault("🏳️")
}

fun ProductCardDto.toDomain(): Product = Product(
    id = id,
    title = title,
    description = "",
    categoryId = "",
    subcategory = "",
    price = price,
    originalCurrency = currency,
    condition = conditionFromKey(condition),
    country = countryCode ?: "",
    city = city ?: "",
    district = "",
    sellerId = seller.id,
    sellerName = seller.name,
    sellerPhone = "",
    sellerWhatsapp = "",
    sellerAvatar = seller.avatarUrl ?: "",
    isVerifiedSeller = seller.verified,
    isBusinessSeller = business != null,
    imageUrls = listOfNotNull(thumbnailUrl ?: imageUrl),
    videoUrl = videoUrl,
    videoPosterUrl = videoPosterUrl,
    videoDurationSeconds = videoDurationSeconds,
    hasVideo = hasVideo,
    views = viewCount,
    isFeatured = featured,
    isFavorite = isFavorited ?: false,
    negotiable = negotiable,
    deliveryAvailable = deliveryAvailable,
    createdAt = parseIsoToMillis(publishedAt)
)

fun ProductDetailDto.toDomain(): Product = Product(
    id = id,
    title = title,
    description = description ?: "",
    categoryId = categoryId.toString(),
    subcategory = "",
    price = price,
    originalCurrency = currency,
    condition = conditionFromKey(condition),
    country = countryCode ?: "",
    city = city ?: "",
    district = "",
    sellerId = seller.id,
    sellerName = seller.name,
    sellerPhone = contact?.phone ?: "",
    sellerWhatsapp = contact?.whatsapp ?: "",
    sellerAvatar = seller.avatarUrl ?: "",
    isVerifiedSeller = seller.verified,
    isBusinessSeller = business != null,
    // Photos only: the gallery pager would otherwise try to render a video
    // file as an image and show a broken tile.
    // Photos only. A listing that was filmed rather than photographed has an
    // empty list here, and the screen shows the video itself instead of
    // dressing its poster up as a photo.
    imageUrls = images?.filter { it.mediaType != "video" }?.sortedBy { it.position }?.map { it.url }
        ?: listOfNotNull(thumbnailUrl ?: imageUrl),
    videoUrl = images?.firstOrNull { it.mediaType == "video" }?.url,
    videoPosterUrl = images?.firstOrNull { it.mediaType == "video" }?.thumbnailUrl,
    videoDurationSeconds = images?.firstOrNull { it.mediaType == "video" }?.durationSeconds,
    hasVideo = hasVideo || images?.any { it.mediaType == "video" } == true,
    views = viewCount,
    isFeatured = featured,
    isFavorite = isFavorited ?: false,
    negotiable = negotiable,
    deliveryAvailable = deliveryAvailable,
    createdAt = parseIsoToMillis(createdAt ?: publishedAt)
)

fun ProductCardDto.toSeller(fallbackCountry: String, fallbackCity: String): Seller = Seller(
    id = seller.id,
    name = seller.name,
    username = seller.name.lowercase().replace(" ", "_"),
    phone = "",
    whatsapp = "",
    country = fallbackCountry,
    city = fallbackCity,
    isVerified = seller.verified,
    isBusiness = business != null,
    businessName = business?.name,
    rating = 4.5f,
    reviewCount = 0,
    joinedDate = "",
    about = "Seller on East-Market."
)

fun HomeAdDto.toDomain(): HomeAd = HomeAd(
    id = id,
    title = title,
    subtitle = subtitle,
    badge = badge,
    ctaLabel = ctaLabel,
    theme = theme,
    icon = icon,
    imageUrl = imageUrl,
    targetType = targetType,
    targetValue = targetValue,
    categoryId = categoryId
)

fun ConversationSummaryDto.toDomain(): Conversation = Conversation(
    id = id,
    otherUserId = otherParty.id,
    otherUserName = otherParty.name,
    otherUserAvatar = otherParty.avatarUrl ?: "",
    lastMessage = lastMessagePreview ?: "",
    lastTimestamp = parseIsoToMillis(lastMessageAt ?: createdAt),
    unreadCount = unreadCount,
    productId = product?.id ?: "",
    productTitle = product?.title ?: "",
    productPrice = product?.price ?: 0.0,
    productCurrency = product?.currency ?: "USD",
    productImage = product?.thumbnailUrl ?: "",
    lastSenderIsMe = lastSenderIsMe,
    role = role,
    productRef = product?.ref
)

fun MessageDto.toDomain(otherName: String): ChatMessage = ChatMessage(
    id = id,
    conversationId = conversationId,
    senderId = senderId,
    senderName = if (isMine) "You" else otherName,
    text = body ?: "",
    timestamp = parseIsoToMillis(createdAt),
    isFromMe = isMine,
    readAt = readAt?.let { parseIsoToMillis(it) }
)
