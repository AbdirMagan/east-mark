import SwiftUI

/// Preferences that outlive a screen: language and the chosen country. Kept in
/// UserDefaults so the app opens where the person left off, the same way the
/// web app persists its preferences.
@MainActor
final class AppState: ObservableObject {
    @Published var language: AppLanguage {
        didSet { UserDefaults.standard.set(language.rawValue, forKey: "em.language") }
    }

    @Published var countryId: Int? {
        didSet {
            if let countryId {
                UserDefaults.standard.set(countryId, forKey: "em.countryId")
            } else {
                UserDefaults.standard.removeObject(forKey: "em.countryId")
            }
        }
    }

    @Published var countryName: String?
    @Published var unreadMessages = 0

    init() {
        let stored = UserDefaults.standard.string(forKey: "em.language") ?? "en"
        self.language = AppLanguage(rawValue: stored) ?? .en
        let country = UserDefaults.standard.integer(forKey: "em.countryId")
        self.countryId = country == 0 ? nil : country
    }

    /// Short helper so views read `state.t("buy")` rather than the long form.
    func t(_ key: String) -> String {
        Strings.value(key, language)
    }

    func refreshUnread() async {
        let count = try? await API.unread()
        unreadMessages = count?.total ?? 0
    }
}
