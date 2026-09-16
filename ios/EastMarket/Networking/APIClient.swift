import Foundation

enum APIError: LocalizedError {
    case offline
    case server(status: Int, message: String)
    case decoding(String)

    var errorDescription: String? {
        switch self {
        case .offline:
            return "Could not reach the marketplace. Check your connection."
        case .server(_, let message):
            return message
        case .decoding(let detail):
            return "Unexpected response from the server (" + detail + ")."
        }
    }
}

/// Talks to the East-Market backend: the same API the web and Android apps use.
///
/// The base URL comes from Info.plist, so a device build can point at the Mac's
/// address on the Wi-Fi without touching code. Auth is per call: the token, when
/// there is one, comes from AuthStore through tokenProvider.
final class APIClient {
    static let shared = APIClient()

    /// Set by AuthStore once a session has loaded.
    var tokenProvider: () async -> String? = { nil }
    /// Called when the backend rejects the token, so the session can refresh once.
    var onUnauthorized: () async -> Bool = { false }

    let baseURL: URL
    private let session: URLSession
    private let decoder = JSONDecoder()

    private init() {
        let configured = Bundle.main.object(forInfoDictionaryKey: "API_BASE_URL") as? String
        let fallback = URL(string: "http://localhost:4000/api/v1")!
        self.baseURL = URL(string: configured ?? "") ?? fallback
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 20
        self.session = URLSession(configuration: config)
    }

    func get<T: Decodable>(_ path: String, query: [String: String?] = [:], authorized: Bool = false) async throws -> T {
        try await send(path: path, method: "GET", query: query, body: nil, authorized: authorized)
    }

    func post<T: Decodable>(_ path: String, json: [String: Any]? = nil, authorized: Bool = true) async throws -> T {
        var body: Data?
        if let json { body = try JSONSerialization.data(withJSONObject: json) }
        return try await send(path: path, method: "POST", query: [:], body: body, authorized: authorized)
    }

    func patch<T: Decodable>(_ path: String, json: [String: Any], authorized: Bool = true) async throws -> T {
        let body = try JSONSerialization.data(withJSONObject: json)
        return try await send(path: path, method: "PATCH", query: [:], body: body, authorized: authorized)
    }

    func put<T: Decodable>(_ path: String, authorized: Bool = true) async throws -> T {
        try await send(path: path, method: "PUT", query: [:], body: nil, authorized: authorized)
    }

    func delete<T: Decodable>(_ path: String, authorized: Bool = true) async throws -> T {
        try await send(path: path, method: "DELETE", query: [:], body: nil, authorized: authorized)
    }

    private func send<T: Decodable>(
        path: String,
        method: String,
        query: [String: String?],
        body: Data?,
        authorized: Bool,
        isRetry: Bool = false
    ) async throws -> T {
        var components = URLComponents(
            url: baseURL.appendingPathComponent(path),
            resolvingAgainstBaseURL: false
        )
        var items: [URLQueryItem] = []
        for (key, value) in query {
            guard let value, !value.isEmpty else { continue }
            items.append(URLQueryItem(name: key, value: value))
        }
        if !items.isEmpty { components?.queryItems = items }
        guard let url = components?.url else { throw APIError.offline }

        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        if let body {
            request.httpBody = body
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        }
        if authorized, let token = await tokenProvider() {
            request.setValue("Bearer " + token, forHTTPHeaderField: "Authorization")
        }

        let data: Data
        let response: URLResponse
        do {
            let result = try await session.data(for: request)
            data = result.0
            response = result.1
        } catch {
            throw APIError.offline
        }

        let status = (response as? HTTPURLResponse)?.statusCode ?? 0

        // One retry after a refresh: that is what an expired session looks like.
        if status == 401 && authorized && !isRetry {
            let refreshed = await onUnauthorized()
            if refreshed {
                return try await send(
                    path: path, method: method, query: query,
                    body: body, authorized: authorized, isRetry: true
                )
            }
        }

        guard (200..<300).contains(status) else {
            let parsed = try? decoder.decode(ErrorBody.self, from: data)
            let message = parsed?.message ?? "Something went wrong (\(status))."
            throw APIError.server(status: status, message: message)
        }

        do {
            let envelope = try decoder.decode(Envelope<T>.self, from: data)
            guard let payload = envelope.data else {
                throw APIError.decoding("no data for " + path)
            }
            return payload
        } catch let error as APIError {
            throw error
        } catch {
            throw APIError.decoding(String(describing: error))
        }
    }

    /// Uploads bytes to a Supabase signed URL. Used by the sell flow, where the
    /// photo goes straight from the phone to storage rather than through the API.
    func upload(to urlString: String, data: Data, contentType: String) async throws {
        guard let url = URL(string: urlString) else { throw APIError.offline }
        var request = URLRequest(url: url)
        request.httpMethod = "PUT"
        request.setValue(contentType, forHTTPHeaderField: "Content-Type")
        request.httpBody = data
        let (_, response) = try await session.data(for: request)
        let status = (response as? HTTPURLResponse)?.statusCode ?? 0
        guard (200..<300).contains(status) else {
            throw APIError.server(status: status, message: "Could not upload the photo.")
        }
    }
}
