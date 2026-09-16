import Foundation

/// A signed-in session, as Supabase's auth API returns it.
struct Session: Codable {
    let accessToken: String
    let refreshToken: String
    let expiresAt: Date
    let userId: String
    let email: String?

    var isExpiringSoon: Bool {
        expiresAt.timeIntervalSinceNow < 60
    }
}

/// Sign in, sign up and token refresh against Supabase Auth, mirroring what
/// web/src/lib/supabase.ts and the Android AuthRepository do.
///
/// The session is kept in UserDefaults. That is fine for a development build;
/// before the App Store it should move to the Keychain, which survives backups
/// being restored onto another device without leaking the token.
@MainActor
final class AuthStore: ObservableObject {
    @Published private(set) var session: Session?
    @Published private(set) var profile: Profile?
    @Published var lastError: String?
    @Published var isWorking = false

    private let storageKey = "em.session"
    private let supabaseURL: String
    private let anonKey: String

    var isSignedIn: Bool { session != nil }

    init() {
        let info = Bundle.main.infoDictionary ?? [:]
        self.supabaseURL = (info["SUPABASE_URL"] as? String) ?? ""
        self.anonKey = (info["SUPABASE_ANON_KEY"] as? String) ?? ""
        loadSession()

        APIClient.shared.tokenProvider = { [weak self] in
            guard let self else { return nil }
            return await self.validAccessToken()
        }
        APIClient.shared.onUnauthorized = { [weak self] in
            guard let self else { return false }
            return await self.refreshSession()
        }

        if session != nil {
            Task { await loadProfile() }
        }
    }

    // MARK: - Public actions

    func signIn(email: String, password: String) async {
        await authenticate(
            path: "token?grant_type=password",
            body: ["email": email, "password": password]
        )
    }

    func signUp(email: String, password: String, fullName: String) async {
        await authenticate(
            path: "signup",
            body: [
                "email": email,
                "password": password,
                "data": ["full_name": fullName]
            ]
        )
    }

    func signOut() {
        session = nil
        profile = nil
        UserDefaults.standard.removeObject(forKey: storageKey)
    }

    func loadProfile() async {
        guard session != nil else { return }
        profile = try? await API.me()
    }

    /// The token to send with a request, refreshed first when it is about to expire.
    func validAccessToken() async -> String? {
        guard let current = session else { return nil }
        if current.isExpiringSoon {
            let refreshed = await refreshSession()
            if !refreshed { return nil }
        }
        return session?.accessToken
    }

    @discardableResult
    func refreshSession() async -> Bool {
        guard let current = session else { return false }
        let body: [String: Any] = ["refresh_token": current.refreshToken]
        guard let payload = await callAuth(path: "token?grant_type=refresh_token", body: body) else {
            signOut()
            return false
        }
        store(payload)
        return session != nil
    }

    // MARK: - Supabase plumbing

    private func authenticate(path: String, body: [String: Any]) async {
        isWorking = true
        lastError = nil
        let payload = await callAuth(path: path, body: body)
        isWorking = false

        guard let payload else { return }
        store(payload)
        if session != nil {
            await loadProfile()
        } else {
            // Sign-up with email confirmation switched on returns no session.
            lastError = "Check your email to confirm the account, then sign in."
        }
    }

    private func callAuth(path: String, body: [String: Any]) async -> [String: Any]? {
        guard let url = URL(string: supabaseURL + "/auth/v1/" + path) else {
            lastError = "The app is not configured with a Supabase address."
            return nil
        }
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue(anonKey, forHTTPHeaderField: "apikey")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try? JSONSerialization.data(withJSONObject: body)

        do {
            let (data, response) = try await URLSession.shared.data(for: request)
            let status = (response as? HTTPURLResponse)?.statusCode ?? 0
            let json = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any]
            guard (200..<300).contains(status) else {
                let message = (json?["error_description"] as? String)
                    ?? (json?["msg"] as? String)
                    ?? (json?["message"] as? String)
                    ?? "Sign in failed (\(status))."
                lastError = message
                return nil
            }
            return json
        } catch {
            lastError = "Could not reach the sign-in service. Check your connection."
            return nil
        }
    }

    private func store(_ payload: [String: Any]) {
        guard
            let accessToken = payload["access_token"] as? String,
            let refreshToken = payload["refresh_token"] as? String
        else { return }

        let expiresIn = (payload["expires_in"] as? Double) ?? 3600
        let user = payload["user"] as? [String: Any]
        let newSession = Session(
            accessToken: accessToken,
            refreshToken: refreshToken,
            expiresAt: Date().addingTimeInterval(expiresIn),
            userId: (user?["id"] as? String) ?? "",
            email: user?["email"] as? String
        )
        session = newSession
        if let encoded = try? JSONEncoder().encode(newSession) {
            UserDefaults.standard.set(encoded, forKey: storageKey)
        }
    }

    private func loadSession() {
        guard
            let data = UserDefaults.standard.data(forKey: storageKey),
            let stored = try? JSONDecoder().decode(Session.self, from: data)
        else { return }
        session = stored
    }
}
