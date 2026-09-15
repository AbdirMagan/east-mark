package com.example.data.model

data class Country(
    val id: String,
    val name: String,
    val flag: String,
    val defaultCurrency: String,
    val phonePrefix: String,
    val cities: List<String>
)

data class City(
    val id: String,
    val name: String,
    val countryId: String
)

enum class Currency(val code: String, val symbol: String, val label: String, val rateToUsd: Double) {
    USD("USD", "$", "US Dollar", 1.0),
    SLSH("SLSH", "Sl.Sh", "Somaliland Shilling", 8500.0),
    DJF("DJF", "Fdj", "Djiboutian Franc", 177.72),
    SOSH("SOSH", "So.Sh", "Somali Shilling", 570.0),
    ETB("ETB", "Br", "Ethiopian Birr", 125.0),
    KES("KES", "KSh", "Kenyan Shilling", 130.0);

    companion object {
        fun fromCode(code: String): Currency = entries.firstOrNull { it.code.equals(code, ignoreCase = true) } ?: USD
    }
}

enum class AppLanguage(val code: String, val displayName: String, val nativeName: String, val flag: String) {
    ENGLISH("en", "English", "English", "🇬🇧"),
    SOMALI("so", "Somali", "Af Soomaali", "🇸🇴"),
    AMHARIC("am", "Amharic", "አማርኛ", "🇪🇹"),
    SWAHILI("sw", "Swahili", "Kiswahili", "🇰🇪");

    companion object {
        fun fromCode(code: String): AppLanguage = entries.firstOrNull { it.code == code } ?: ENGLISH
    }
}

enum class ProductCondition(val key: String) {
    NEW("new"),
    LIKE_NEW("like_new"),
    REFURBISHED("refurbished"),
    USED("used")
}

data class CategoryItem(
    val id: String,
    val name: String,
    val iconName: String,
    val subcategories: List<String>
)

data class Product(
    val id: String,
    val title: String,
    val description: String,
    val categoryId: String,
    val subcategory: String,
    val price: Double,
    val originalCurrency: String,
    val condition: ProductCondition,
    val country: String,
    val city: String,
    val district: String = "",
    val sellerId: String,
    val sellerName: String,
    val sellerPhone: String,
    val sellerWhatsapp: String,
    val sellerAvatar: String = "",
    val isVerifiedSeller: Boolean = false,
    val isBusinessSeller: Boolean = false,
    val imageUrls: List<String> = emptyList(),
    val views: Int = 1,
    val isFeatured: Boolean = false,
    val isFavorite: Boolean = false,
    val negotiable: Boolean = false,
    val deliveryAvailable: Boolean = false,
    val createdAt: Long = System.currentTimeMillis()
)

data class Seller(
    val id: String,
    val name: String,
    val username: String,
    val phone: String,
    val whatsapp: String,
    val country: String,
    val city: String,
    val isVerified: Boolean,
    val isBusiness: Boolean,
    val businessName: String? = null,
    val rating: Float,
    val reviewCount: Int,
    val joinedDate: String,
    val about: String
)

data class Review(
    val id: String,
    val sellerId: String,
    val reviewerName: String,
    val rating: Int,
    val comment: String,
    val date: String
)

data class Conversation(
    val id: String,
    val otherUserId: String,
    val otherUserName: String,
    val otherUserAvatar: String,
    val lastMessage: String,
    val lastTimestamp: Long,
    val unreadCount: Int,
    val productId: String,
    val productTitle: String,
    val productPrice: Double,
    val productCurrency: String,
    val productImage: String,
    val lastSenderIsMe: Boolean = false,
    val role: String = "buyer",
    val productRef: Int? = null
)

data class ChatMessage(
    val id: String,
    val conversationId: String,
    val senderId: String,
    val senderName: String,
    val text: String,
    val timestamp: Long,
    val isFromMe: Boolean,
    /** When the other person read it; null until then. */
    val readAt: Long? = null,
    /** Not yet confirmed by the server. */
    val pending: Boolean = false
)

data class FilterCriteria(
    val query: String = "",
    val categoryId: String? = null,
    val country: String? = null,
    val city: String? = null,
    val minPrice: Double? = null,
    val maxPrice: Double? = null,
    val condition: ProductCondition? = null,
    val verifiedOnly: Boolean = false,
    val deliveryOnly: Boolean = false,
    val sortBy: SortOption = SortOption.NEWEST
)

enum class SortOption {
    NEWEST,
    PRICE_LOW_HIGH,
    PRICE_HIGH_LOW,
    POPULAR
}

/** A home-carousel promotion (GET /ads?placement=home_hero). */
data class HomeAd(
    val id: String,
    val title: String,
    val subtitle: String?,
    val badge: String?,
    val ctaLabel: String?,
    val theme: String,
    val icon: String?,
    val imageUrl: String?,
    val targetType: String,
    val targetValue: String?,
    val categoryId: Int?
)
