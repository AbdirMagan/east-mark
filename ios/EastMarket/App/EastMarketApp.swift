import SwiftUI

@main
struct EastMarketApp: App {
    @StateObject private var auth = AuthStore()
    @StateObject private var state = AppState()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(auth)
                .environmentObject(state)
                .tint(Brand.clay)
        }
    }
}
