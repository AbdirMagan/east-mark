import SwiftUI

/// Sign in or out, the person's name, saved listings and the language choice.
struct AccountView: View {
    @EnvironmentObject private var state: AppState
    @EnvironmentObject private var auth: AuthStore

    @State private var email = ""
    @State private var password = ""
    @State private var passwordVisible = false
    @State private var resetSent = false
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

            // A password box that can be unmasked. Typing one blind on a phone
            // keyboard is hard, and a mistyped character shows up only as a
            // sign-in that fails without saying which field was wrong.
            HStack {
                Group {
                    if passwordVisible {
                        TextField(state.t("password"), text: $password)
                            .textInputAutocapitalization(.never)
                            .autocorrectionDisabled()
                    } else {
                        SecureField(state.t("password"), text: $password)
                    }
                }
                .textContentType(isRegistering ? .newPassword : .password)

                Button {
                    passwordVisible.toggle()
                } label: {
                    Image(systemName: passwordVisible ? "eye.slash" : "eye")
                        .foregroundColor(Brand.muted)
                }
                // Without this the row's own tap target swallows the button.
                .buttonStyle(.borderless)
                .accessibilityLabel(passwordVisible ? state.t("hidePassword") : state.t("showPassword"))
            }

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

            // Only on sign-in: someone creating an account has no password to
            // have forgotten. Needs the address, which they have usually just
            // typed, so it uses the field rather than asking again.
            if !isRegistering {
                Button(state.t("forgotPassword")) {
                    Task {
                        if await auth.requestPasswordReset(email: email) {
                            resetSent = true
                        }
                    }
                }
                .font(.footnote)
                .disabled(email.isEmpty || auth.isWorking)
            }

            if resetSent {
                Text(state.t("forgotSent"))
                    .font(.footnote)
                    .foregroundColor(Brand.muted)
            }
        }
    }

    private var initials: String {
        let name = auth.profile?.displayName ?? auth.session?.email ?? "E"
        let parts = name.split(separator: " ").prefix(2)
        let letters = parts.compactMap { $0.first }
        return String(letters).uppercased()
    }
}
