package com.example.data.remote

import com.squareup.moshi.JsonClass

/* -------------------------------------------------------------------------- */
/* Promotions: the home carousel, same endpoint and fields as the web app     */
/* -------------------------------------------------------------------------- */

@JsonClass(generateAdapter = true)
data class HomeAdDto(
    val id: String,
    val title: String,
    val subtitle: String? = null,
    val badge: String? = null,
    val ctaLabel: String? = null,
    val theme: String = "night",
    val icon: String? = null,
    val imageUrl: String? = null,
    val targetType: String = "url",
    val targetValue: String? = null,
    val link: String? = null,
    val categoryId: Int? = null
)

/* -------------------------------------------------------------------------- */
/* Messages (backend/src/services/messages.service.ts)                        */
/* -------------------------------------------------------------------------- */

@JsonClass(generateAdapter = true)
data class OtherPartyDto(
    val id: String,
    val name: String,
    val avatarUrl: String? = null
)

@JsonClass(generateAdapter = true)
data class ConversationProductDto(
    val id: String,
    val ref: Int,
    val title: String,
    val price: Double,
    val currency: String,
    val thumbnailUrl: String? = null,
    val status: String? = null
)

@JsonClass(generateAdapter = true)
data class ConversationSummaryDto(
    val id: String,
    val role: String,
    val otherParty: OtherPartyDto,
    val product: ConversationProductDto? = null,
    val productRemoved: Boolean = false,
    val lastMessageAt: String? = null,
    val lastMessagePreview: String? = null,
    val lastSenderIsMe: Boolean = false,
    val unreadCount: Int = 0,
    val createdAt: String
)

@JsonClass(generateAdapter = true)
data class MessageDto(
    val id: String,
    val conversationId: String,
    val senderId: String,
    val type: String,
    val body: String? = null,
    val createdAt: String,
    val readAt: String? = null,
    val isMine: Boolean
)

@JsonClass(generateAdapter = true)
data class MessagePageDto(
    val items: List<MessageDto>,
    val hasMore: Boolean
)

@JsonClass(generateAdapter = true)
data class ConversationIdDto(val id: String)

@JsonClass(generateAdapter = true)
data class UnreadDto(val total: Int, val conversations: Int)

@JsonClass(generateAdapter = true)
data class StartConversationBody(val productId: String)

@JsonClass(generateAdapter = true)
data class SendMessageBody(val body: String)
