import Foundation

/// The backend's response envelope: success, data, message, meta.
struct Envelope<T: Decodable>: Decodable {
    let success: Bool
    let data: T?
    let message: String?
    let meta: PageMeta?
}

struct PageMeta: Decodable {
    let page: Int
    let limit: Int
    let total: Int
    let totalPages: Int
    let hasMore: Bool
}

struct ErrorBody: Decodable {
    let message: String?
    let code: String?
}

// MARK: - Reference data

struct Country: Decodable, Identifiable, Hashable {
    let id: Int
    let code: String
    let name: String
    let dialCode: String?
    let defaultCurrency: String?
}

struct Place: Decodable, Identifiable, Hashable {
    let id: Int
    let name: String
}

struct Category: Decodable, Identifiable, Hashable {
    let id: Int
    let slug: String
    let name: String
    let icon: String?
    let accentColor: String?
    let parentId: Int?
    let children: [Category]?
}

// MARK: - Listings

struct SellerRef: Decodable, Hashable {
    let id: String
    let name: String
    let avatarUrl: String?
    let verified: Bool
}

struct ProductImage: Decodable, Identifiable, Hashable {
    let id: String
    let url: String
    let thumbnailUrl: String?
    let isPrimary: Bool
}

struct ProductCard: Decodable, Identifiable, Hashable {
    let id: String
    let ref: Int
    let title: String
    let price: Double
    let currency: String
    let negotiable: Bool
    let condition: String
    let city: String?
    let thumbnailUrl: String?
    let imageUrl: String?
    let featured: Bool
    let publishedAt: String?
    let seller: SellerRef
    let isFavorited: Bool?

    var displayImage: String? { thumbnailUrl ?? imageUrl }
}

struct ProductDetail: Decodable, Identifiable, Hashable {
    let id: String
    let ref: Int
    let title: String
    let price: Double
    let currency: String
    let negotiable: Bool
    let condition: String
    let city: String?
    let description: String?
    let categoryId: Int
    let status: String?
    let images: [ProductImage]?
    let seller: SellerRef
    let contact: Contact?
    let shareUrl: String?

    struct Contact: Decodable, Hashable {
        let phone: String?
        let whatsapp: String?
    }
}

// MARK: - Promotions

struct HomeAd: Decodable, Identifiable, Hashable {
    let id: String
    let title: String
    let subtitle: String?
    let badge: String?
    let ctaLabel: String?
    let theme: String?
    let icon: String?
    let imageUrl: String?
    let targetType: String?
    let targetValue: String?
    let link: String?
    let categoryId: Int?
}

// MARK: - Messaging

struct OtherParty: Decodable, Hashable {
    let id: String
    let name: String
    let avatarUrl: String?
}

struct ConversationProduct: Decodable, Hashable {
    let id: String
    let ref: Int
    let title: String
    let price: Double
    let currency: String
    let thumbnailUrl: String?
}

struct ConversationSummary: Decodable, Identifiable, Hashable {
    let id: String
    let role: String
    let otherParty: OtherParty
    let product: ConversationProduct?
    let lastMessageAt: String?
    let lastMessagePreview: String?
    let lastSenderIsMe: Bool
    let unreadCount: Int
    let createdAt: String
}

struct ChatMessage: Decodable, Identifiable, Hashable {
    let id: String
    let conversationId: String
    let senderId: String
    let body: String?
    let createdAt: String
    let readAt: String?
    let isMine: Bool
}

struct MessagePage: Decodable {
    let items: [ChatMessage]
    let hasMore: Bool
}

struct ConversationRef: Decodable {
    let id: String
}

struct UnreadCount: Decodable {
    let total: Int
    let conversations: Int
}

// MARK: - Account

struct Profile: Decodable {
    let id: String
    let username: String?
    let fullName: String?
    let avatarUrl: String?
    let role: String?

    /// The name to greet someone by, never a raw id.
    var displayName: String {
        if let fullName, !fullName.trimmingCharacters(in: .whitespaces).isEmpty { return fullName }
        if let username, !username.isEmpty { return username }
        return "East Market"
    }
}

// MARK: - Selling

struct CreatedListing: Decodable {
    let id: String
    let ref: Int
    let status: String
}

struct UploadSlot: Decodable {
    let uploadUrl: String
    let token: String
    let path: String
}

struct UploadSlots: Decodable {
    let full: UploadSlot
    let thumbnail: UploadSlot
}
