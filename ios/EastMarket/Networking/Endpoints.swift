import Foundation

/// Every call the app makes, in one place, mirroring web/src/lib/api.ts.
enum API {
    private static var client: APIClient { APIClient.shared }

    // MARK: Reference data

    static func categories(lang: String) async throws -> [Category] {
        try await client.get("categories", query: ["lang": lang])
    }

    static func countries(lang: String) async throws -> [Country] {
        try await client.get("locations/countries", query: ["lang": lang])
    }

    static func cities(countryId: Int, lang: String) async throws -> [Place] {
        try await client.get("locations/cities", query: [
            "countryId": String(countryId), "major": "true", "lang": lang
        ])
    }

    // MARK: Promotions

    static func homeAds(lang: String, countryId: Int?) async throws -> [HomeAd] {
        try await client.get("ads", query: [
            "placement": "home_hero",
            "lang": lang,
            "countryId": countryId.map(String.init)
        ])
    }

    static func recordAdClick(_ id: String) async {
        _ = try? await fire(path: "ads/" + id + "/click", method: "POST", json: nil, authorized: false)
    }

    // MARK: Listings

    static func products(
        search: String? = nil,
        categoryId: Int? = nil,
        countryId: Int? = nil,
        featuredOnly: Bool = false,
        sort: String = "newest",
        limit: Int = 30
    ) async throws -> [ProductCard] {
        try await client.get("products", query: [
            "q": search,
            "categoryId": categoryId.map(String.init),
            "countryId": countryId.map(String.init),
            "featuredOnly": featuredOnly ? "true" : nil,
            "sort": sort,
            "limit": String(limit)
        ], authorized: true)
    }

    static func product(ref: Int) async throws -> ProductDetail {
        try await client.get("products/ref/" + String(ref), authorized: true)
    }

    static func similar(productId: String) async throws -> [ProductCard] {
        try await client.get("products/" + productId + "/similar")
    }

    static func recordView(productId: String) async {
        _ = try? await fire(
            path: "products/" + productId + "/view",
            method: "POST",
            json: ["source": "app"],
            authorized: true
        )
    }

    // MARK: Account

    static func me() async throws -> Profile {
        try await client.get("users/me", authorized: true)
    }

    static func favorites() async throws -> [ProductCard] {
        try await client.get("users/me/favorites", query: ["limit": "50"], authorized: true)
    }

    static func addFavorite(productId: String) async throws {
        _ = try await fire(path: "users/me/favorites/" + productId, method: "PUT", json: nil, authorized: true)
    }

    static func removeFavorite(productId: String) async throws {
        _ = try await fire(path: "users/me/favorites/" + productId, method: "DELETE", json: nil, authorized: true)
    }

    // MARK: Messaging

    static func conversations() async throws -> [ConversationSummary] {
        try await client.get("messages/conversations", authorized: true)
    }

    static func startConversation(productId: String) async throws -> ConversationRef {
        try await client.post("messages/conversations", json: ["productId": productId])
    }

    static func messages(conversationId: String) async throws -> MessagePage {
        try await client.get(
            "messages/conversations/" + conversationId + "/messages",
            query: ["limit": "50"],
            authorized: true
        )
    }

    static func sendMessage(conversationId: String, body: String) async throws -> ChatMessage {
        try await client.post(
            "messages/conversations/" + conversationId + "/messages",
            json: ["body": body]
        )
    }

    static func markRead(conversationId: String) async {
        _ = try? await fire(
            path: "messages/conversations/" + conversationId + "/read",
            method: "POST",
            json: nil,
            authorized: true
        )
    }

    static func unread() async throws -> UnreadCount {
        try await client.get("messages/unread", authorized: true)
    }

    // MARK: Selling

    static func createListing(_ fields: [String: Any]) async throws -> CreatedListing {
        try await client.post("products", json: fields)
    }

    static func uploadSlots(productId: String, contentType: String) async throws -> UploadSlots {
        try await client.post(
            "products/" + productId + "/images/upload-url",
            json: ["contentType": contentType]
        )
    }

    static func registerImage(productId: String, path: String, thumbnailPath: String) async throws -> ProductImage {
        try await client.post(
            "products/" + productId + "/images",
            json: ["path": path, "thumbnailPath": thumbnailPath, "isPrimary": true]
        )
    }

    static func submitForReview(productId: String) async throws {
        let _: CreatedListingStatus = try await client.patch(
            "products/" + productId + "/status",
            json: ["status": "pending_approval"]
        )
    }

    /// Some endpoints answer with data: null, which the typed decoder cannot
    /// express. These fire the request and only care that it succeeded.
    @discardableResult
    private static func fire(path: String, method: String, json: [String: Any]?, authorized: Bool) async throws -> Bool {
        var request = URLRequest(url: client.baseURL.appendingPathComponent(path))
        request.httpMethod = method
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        if let json {
            request.httpBody = try JSONSerialization.data(withJSONObject: json)
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        }
        if authorized, let token = await client.tokenProvider() {
            request.setValue("Bearer " + token, forHTTPHeaderField: "Authorization")
        }
        let (_, response) = try await URLSession.shared.data(for: request)
        let status = (response as? HTTPURLResponse)?.statusCode ?? 0
        guard (200..<300).contains(status) else {
            throw APIError.server(status: status, message: "Request failed (\(status)).")
        }
        return true
    }
}

/// The shape /products/:id/status answers with.
struct CreatedListingStatus: Decodable {
    let id: String
    let status: String
}
