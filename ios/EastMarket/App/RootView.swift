import SwiftUI

/// The five tabs, matching the Android app's bottom bar: Home, Browse, Sell,
/// Messages, Account.
struct RootView: View {
    @EnvironmentObject private var state: AppState
    @EnvironmentObject private var auth: AuthStore
    @State private var selection = 0

    var body: some View {
        TabView(selection: $selection) {
            HomeView()
                .tabItem { Label(state.t("home"), systemImage: "house") }
                .tag(0)

            BrowseView()
                .tabItem { Label(state.t("browse"), systemImage: "magnifyingglass") }
                .tag(1)

            SellView()
                .tabItem { Label(state.t("sell"), systemImage: "plus.circle") }
                .tag(2)

            MessagesView()
                .tabItem { Label(state.t("messages"), systemImage: "bubble.left.and.bubble.right") }
                .badge(state.unreadMessages)
                .tag(3)

            AccountView()
                .tabItem { Label(state.t("account"), systemImage: "person.crop.circle") }
                .tag(4)
        }
        .task(id: auth.isSignedIn) {
            guard auth.isSignedIn else {
                state.unreadMessages = 0
                return
            }
            await state.refreshUnread()
        }
    }
}
