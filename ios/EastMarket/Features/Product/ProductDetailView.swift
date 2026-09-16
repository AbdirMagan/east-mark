import SwiftUI

@MainActor
final class ProductDetailViewModel: ObservableObject {
    @Published var product: ProductDetail?
    @Published var similar: [ProductCard] = []
    @Published var errorMessage: String?
    @Published var isStartingChat = false

    func load(ref: Int) async {
        do {
            let detail = try await API.product(ref: ref)
            product = detail
            Task { await API.recordView(productId: detail.id) }
            similar = (try? await API.similar(productId: detail.id)) ?? []
        } catch {
            errorMessage = (error as? APIError)?.errorDescription ?? error.localizedDescription
        }
    }
}

struct ProductDetailView: View {
    let ref: Int

    @EnvironmentObject private var state: AppState
    @EnvironmentObject private var auth: AuthStore
    @StateObject private var model = ProductDetailViewModel()
    @State private var conversationId: String?
    @State private var showChat = false
    @State private var notice: String?

    var body: some View {
        ScrollView {
            if let product = model.product {
                VStack(alignment: .leading, spacing: 16) {
                    gallery(product)

                    VStack(alignment: .leading, spacing: 10) {
                        Text(formatPrice(product.price, currency: product.currency))
                            .font(.system(size: 26, weight: .black))

                        Text(product.title)
                            .font(.title3.weight(.semibold))

                        HStack(spacing: 12) {
                            Label(product.city ?? "-", systemImage: "mappin.and.ellipse")
                            Label(readableCondition(product.condition), systemImage: "tag")
                        }
                        .font(.footnote)
                        .foregroundColor(Brand.muted)

                        Divider()

                        actions(product)

                        if let description = product.description, !description.isEmpty {
                            Text(description)
                                .font(.body)
                                .foregroundColor(Brand.ink.opacity(0.85))
                                .padding(.top, 4)
                        }

                        HStack(spacing: 8) {
                            Image(systemName: "person.crop.circle")
                            Text(product.seller.name).font(.subheadline.weight(.medium))
                            if product.seller.verified {
                                Image(systemName: "checkmark.seal.fill").foregroundColor(Brand.acacia)
                            }
                        }
                        .padding(.top, 8)
                    }
                    .padding(.horizontal, 16)

                    if !model.similar.isEmpty {
                        similarSection
                    }
                }
                .padding(.bottom, 24)
            } else if let message = model.errorMessage {
                VStack(spacing: 12) {
                    Text(message).font(.subheadline).multilineTextAlignment(.center)
                    Button(state.t("retry")) {
                        Task { await model.load(ref: ref) }
                    }
                    .buttonStyle(PillButtonStyle())
                }
                .padding(40)
            } else {
                ProgressView().padding(40)
            }
        }
        .background(Brand.sand)
        .navigationBarTitleDisplayMode(.inline)
        .task { await model.load(ref: ref) }
        .alert(notice ?? "", isPresented: noticeBinding) {
            Button("OK", role: .cancel) { notice = nil }
        }
        .sheet(isPresented: $showChat) {
            if let conversationId, let product = model.product {
                NavigationStack {
                    ChatView(
                        conversationId: conversationId,
                        otherName: product.seller.name,
                        productTitle: product.title
                    )
                }
            }
        }
    }

    private var noticeBinding: Binding<Bool> {
        Binding(
            get: { notice != nil },
            set: { showing in
                if !showing { notice = nil }
            }
        )
    }

    private func readableCondition(_ raw: String) -> String {
        raw.replacingOccurrences(of: "_", with: " ")
    }

    private func gallery(_ product: ProductDetail) -> some View {
        let images = product.images ?? []
        return TabView {
            if images.isEmpty {
                Brand.sandDeep.overlay(
                    Image(systemName: "photo").font(.largeTitle).foregroundColor(Brand.muted)
                )
            } else {
                ForEach(images) { image in
                    AsyncImage(url: URL(string: image.url)) { phase in
                        if case .success(let loaded) = phase {
                            loaded.resizable().scaledToFill()
                        } else {
                            Brand.sandDeep.overlay(ProgressView())
                        }
                    }
                    .clipped()
                }
            }
        }
        .tabViewStyle(.page)
        .frame(height: 280)
    }

    private func actions(_ product: ProductDetail) -> some View {
        VStack(spacing: 10) {
            if let phone = product.contact?.phone, let url = URL(string: "tel://" + phone) {
                Link(destination: url) {
                    Label(state.t("call"), systemImage: "phone.fill")
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 12)
                        .background(Brand.acacia)
                        .foregroundColor(.white)
                        .clipShape(Capsule())
                }
            }

            if let whatsapp = product.contact?.whatsapp {
                let digits = String(whatsapp.filter { character in character.isNumber })
                if let url = URL(string: "https://wa.me/" + digits) {
                    Link(destination: url) {
                        Label(state.t("whatsapp"), systemImage: "message.fill")
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 12)
                            .background(Brand.whatsapp)
                            .foregroundColor(Brand.ink)
                            .clipShape(Capsule())
                    }
                }
            }

            if auth.session?.userId == product.seller.id {
                Text(state.t("ownListing"))
                    .font(.footnote)
                    .foregroundColor(Brand.muted)
            } else {
                Button {
                    Task { await startChat(product) }
                } label: {
                    if model.isStartingChat {
                        ProgressView()
                    } else {
                        Label(state.t("message"), systemImage: "bubble.left")
                    }
                }
                .buttonStyle(PillButtonStyle(background: Brand.navy, fullWidth: true))
            }
        }
    }

    private var similarSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(state.t("featured")).font(.headline).padding(.horizontal, 16)
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 12) {
                    ForEach(model.similar) { item in
                        ProductCardView(product: item).frame(width: 180)
                    }
                }
                .padding(.horizontal, 16)
            }
        }
    }

    private func startChat(_ product: ProductDetail) async {
        guard auth.isSignedIn else {
            notice = state.t("signInToMessage")
            return
        }
        model.isStartingChat = true
        do {
            let reference = try await API.startConversation(productId: product.id)
            conversationId = reference.id
            showChat = true
        } catch {
            notice = (error as? APIError)?.errorDescription ?? error.localizedDescription
        }
        model.isStartingChat = false
    }
}
