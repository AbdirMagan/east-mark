import SwiftUI

/// Sign in or out, the person's name, saved listings and the language choice.
struct AccountView: View {
    @EnvironmentObject private var state: AppState
    @EnvironmentObject private var auth: AuthStore

    @State private var email = ""
    @State private var password = ""
    @State private var fullName = ""
    @State private var isRegistering = false
    @State private var favourites: [ProductCard] = []

    var body: some View {
        NavigationStack {
            Form {
                if auth.isSignedIn {
                    signedInSection
                    favouritesSection
                } else {
                    signInSection
                }

                Section(state.t("language")) {
                    Picker(state.t("language"), selection: $state.language) {
                        ForEach(AppLanguage.allCases) { language in
                            Text(language.nativeName).tag(language)
                        }
                    }
                    .pickerStyle(.menu)
                }

                Section {
                    Text("East Market — the marketplace for Somaliland, Somalia, Ethiopia, Kenya and Djibouti.")
                        .font(.footnote)
                        .foregroundColor(Brand.muted)
                }
            }
            .navigationTitle(state.t("account"))
            .task(id: auth.isSignedIn) {
                guard auth.isSignedIn else {
                    favourites = []
                    return
                }
                await auth.loadProfile()
                favourites = (try? await API.favorites()) ?? []
            }
        }
    }

    private var signedInSection: some View {
        Section {
            HStack(spacing: 12) {
                ZStack {
                    Circle().fill(Brand.acacia)
                    Text(initials).foregroundColor(.white).font(.headline)
                }
                .frame(width: 48, height: 48)

                VStack(alignment: .leading, spacing: 2) {
                    Text(auth.profile?.displayName ?? (auth.session?.email ?? "East Market"))
                        .font(.headline)
                    if let email = auth.session?.email {
                        Text(email).font(.caption).foregroundColor(Brand.muted)
                    }
                }
            }

            Button(role: .destructive) {
                auth.signOut()
            } label: {
                Text(state.t("signOut"))
            }
        }
    }

    private var favouritesSection: some View {
        Section(state.t("favourites")) {
            if favourites.isEmpty {
                Text(state.t("noListings")).font(.footnote).foregroundColor(Brand.muted)
            } else {
                ForEach(favourites) { product in
                    NavigationLink(value: product.ref) {
                        HStack(spacing: 10) {
                            Text(product.title).lineLimit(1)
                            Spacer()
                            Text(formatPrice(product.price, currency: product.currency))
                                .font(.footnote.weight(.semibold))
                                .foregroundColor(Brand.muted)
                        }
                    }
                }
            }
        }
        .navigationDestination(for: Int.self) { ref in
            ProductDetailView(ref: ref)
        }
    }

    private var signInSection: some View {
        Section(isRegistering ? state.t("signUp") : state.t("signIn")) {
            if isRegistering {
                TextField(state.t("name"), text: $fullName)
                    .textContentType(.name)
            }

            TextField(state.t("email"), text: $email)
                .textContentType(.emailAddress)
                .keyboardType(.emailAddress)
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled()

            SecureField(state.t("password"), text: $password)
                .textContentType(isRegistering ? .newPassword : .password)

            if let error = auth.lastError {
                Text(error).font(.footnote).foregroundColor(Brand.clayDark)
            }

            Button {
                Task {
                    if isRegistering {
                        await auth.signUp(email: email, password: password, fullName: fullName)
                    } else {
                        await auth.signIn(email: email, password: password)
                    }
                }
            } label: {
                if auth.isWorking {
                    ProgressView()
                } else {
                    Text(isRegistering ? state.t("signUp") : state.t("signIn"))
                }
            }
            .disabled(email.isEmpty || password.isEmpty || auth.isWorking)

            Button(isRegistering ? state.t("signIn") : state.t("signUp")) {
                isRegistering.toggle()
            }
            .font(.footnote)
        }
    }

    private var initials: String {
        let name = auth.profile?.displayName ?? auth.session?.email ?? "E"
        let parts = name.split(separator: " ").prefix(2)
        let letters = parts.compactMap { $0.first }
        return String(letters).uppercased()
    }
}
