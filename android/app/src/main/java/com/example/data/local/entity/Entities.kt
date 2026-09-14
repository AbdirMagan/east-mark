package com.example.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey
import com.example.data.model.Product
import com.example.data.model.ProductCondition

@Entity(tableName = "products")
data class ProductEntity(
    @PrimaryKey val id: String,
    val title: String,
    val description: String,
    val categoryId: String,
    val subcategory: String,
    val price: Double,
    val originalCurrency: String,
    val condition: String,
    val country: String,
    val city: String,
    val district: String,
    val sellerId: String,
    val sellerName: String,
    val sellerPhone: String,
    val sellerWhatsapp: String,
    val sellerAvatar: String,
    val isVerifiedSeller: Boolean,
    val isBusinessSeller: Boolean,
    val imageUrls: String, // comma separated
    val views: Int,
    val isFeatured: Boolean,
    val negotiable: Boolean,
    val deliveryAvailable: Boolean,
    val createdAt: Long
) {
    fun toDomain(isFavorite: Boolean = false): Product {
        val cond = try {
            ProductCondition.valueOf(condition)
        } catch (e: Exception) {
            ProductCondition.USED
        }
        val images = if (imageUrls.isBlank()) emptyList() else imageUrls.split(",")
        return Product(
            id = id,
            title = title,
            description = description,
            categoryId = categoryId,
            subcategory = subcategory,
            price = price,
            originalCurrency = originalCurrency,
            condition = cond,
            country = country,
            city = city,
            district = district,
            sellerId = sellerId,
            sellerName = sellerName,
            sellerPhone = sellerPhone,
            sellerWhatsapp = sellerWhatsapp,
            sellerAvatar = sellerAvatar,
            isVerifiedSeller = isVerifiedSeller,
            isBusinessSeller = isBusinessSeller,
            imageUrls = images,
            views = views,
            isFeatured = isFeatured,
            isFavorite = isFavorite,
            negotiable = negotiable,
            deliveryAvailable = deliveryAvailable,
            createdAt = createdAt
        )
    }

    companion object {
        fun fromDomain(p: Product): ProductEntity {
            return ProductEntity(
                id = p.id,
                title = p.title,
                description = p.description,
                categoryId = p.categoryId,
                subcategory = p.subcategory,
                price = p.price,
                originalCurrency = p.originalCurrency,
                condition = p.condition.name,
                country = p.country,
                city = p.city,
                district = p.district,
                sellerId = p.sellerId,
                sellerName = p.sellerName,
                sellerPhone = p.sellerPhone,
                sellerWhatsapp = p.sellerWhatsapp,
                sellerAvatar = p.sellerAvatar,
                isVerifiedSeller = p.isVerifiedSeller,
                isBusinessSeller = p.isBusinessSeller,
                imageUrls = p.imageUrls.joinToString(","),
                views = p.views,
                isFeatured = p.isFeatured,
                negotiable = p.negotiable,
                deliveryAvailable = p.deliveryAvailable,
                createdAt = p.createdAt
            )
        }
    }
}

@Entity(tableName = "favorites")
data class FavoriteEntity(
    @PrimaryKey val productId: String,
    val addedAt: Long = System.currentTimeMillis()
)

@Entity(tableName = "conversations")
data class ConversationEntity(
    @PrimaryKey val id: String,
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
    val productImage: String
)

@Entity(tableName = "messages")
data class MessageEntity(
    @PrimaryKey val id: String,
    val conversationId: String,
    val senderId: String,
    val senderName: String,
    val text: String,
    val timestamp: Long,
    val isFromMe: Boolean
)
