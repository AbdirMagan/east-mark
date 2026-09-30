import SwiftUI

@MainActor
final class HomeViewModel: ObservableObject {
    @Published var ads: [HomeAd] = []
    @Published var categories: [Category] = []
    @Published var featured: [ProductCard] = []
    @Published var recent: [ProductCard] = []
    @Published var errorMessage: String?
    @Published var isLoading = false

    /// One pass over everything the home screen shows. The calls run together:
    /// on a slow connection, doing them one after another is a visible wait.
    func load(language: AppLanguage, countryId: Int?) async {
        isLoading = true
        errorMessage = nil

        async let adsTask = API.homeAds(lang: language.rawValue, countryId: countryId)
        async let categoriesTask = API.categories(lang: language.rawValue)
        async let featuredTask = API.products(countryId: countryId, featuredOnly: true, limit: 12)
        async let recentTask = API.products(countryId: countryId, sort: "newest", limit: 20)

        let loadedAds = try? await adsTask
        let loadedCategories = try? await categoriesTask
        let loadedFeatured = try? await featuredTask
        let loadedRecent = try? await recentTask

        ads = loadedAds ?? []
        categories = loadedCategories ?? []
        featured = loadedFeatured ?? []
        recent = loadedRecent ?? []
        isLoading = false

        if loadedRecent == nil && loadedCategories == nil {
            errorMessage = APIError.offline.errorDescription
        }
    }
}

struct HomeView: View {
    @EnvironmentObject private var state: AppState
    @StateObject private var model = HomeViewModel()
    @State private var path = NavigationPath()

    private let columns = [GridItem(.flexible(), spacing: 12), GridItem(.flexible(), spacing: 12)]

    var body: some View {
        NavigationStack(path: $path) {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    if !model.ads.isEmpty {
                        HeroCarousel(ads: model.ads, onSelect: open)
                    }

                    if let message = model.errorMessage {
                        offlineNotice(message)
                    }

                    if !model.categories.isEmpty {
                        categoryStrip
                    }

                    browseModes

                    if !model.featured.isEmpty {
                        section(title: state.t("featured"), products: model.featured)
                    }

                    section(title: state.t("recent"), products: model.recent)
                }
                .padding(.vertical, 12)
            }
            .background(Brand.sand)
            .navigationTitle("East Market")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button {
                        Task { await model.load(language: state.language, countryId: state.countryId) }
                    } label: {
                        Image(systemName: "arrow.clockwise")
                    }
                    .accessibilityLabel(state.t("refresh"))
                }
            }
            .refreshable {
                await model.load(language: state.language, countryId: state.countryId)
            }
            .navigationDestination(for: Int.self) { ref in
                ProductDetailView(ref: ref)
            }
            .navigationDestination(for: Category.self) { category in
                BrowseView(initialCategory: category)
            }
            .navigationDestination(for: VideoFeedRoute.self) { _ in
                VideoFeedView()
            }
            .navigationDestination(for: BrowseRoute.self) { _ in
                BrowseView(media: "photo")
            }
            .task(id: state.language) {
                await model.load(language: state.language, countryId: state.countryId)
            }
        }
    }

    /// The two ways to browse. Photos stay in the grid; video gets its own
    /// feed, because a grid of muted thumbnails is the worst way to show
    /// something that was filmed.
    private var browseModes: some View {
        HStack(spacing: 10) {
            NavigationLink(value: BrowseRoute.photos) {
                modeCard(
                    title: state.t("photoListings"),
                    subtitle: state.t("photoListingsHint"),
                    systemImage: "photo.on.rectangle"
                )
            }

            NavigationLink(value: VideoFeedRoute()) {
                modeCard(
                    title: state.t("videoListings"),
                    subtitle: state.t("videoListingsHint"),
                    systemImage: "play.rectangle.fill"
                )
            }
        }
        .padding(.horizontal, 16)
    }

    private func modeCard(title: String, subtitle: String, systemImage: String) -> some View {
        HStack(spacing: 10) {
            Image(systemName: systemImage)
                .font(.system(size: 17))
                .foregroundColor(Brand.acacia)
                .frame(width: 34, height: 34)
                .background(Brand.acacia.opacity(0.12))
                .clipShape(Circle())

            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.system(size: 13, weight: .bold))
                    .foregroundColor(Brand.ink)
                Text(subtitle)
                    .font(.system(size: 10))
                    .foregroundColor(Brand.muted)
                    .lineLimit(2)
            }

            Spacer(minLength: 0)
        }
        .padding(10)
        .frame(maxWidth: .infinity)
        .background(Color.white)
        .clipShape(RoundedRectangle(cornerRadius: 14))
        .overlay(RoundedRectangle(cornerRadius: 14).strokeBorder(Brand.sandDeep, lineWidth: 1))
    }

    private var categoryStrip: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(state.t("categories"))
                .font(.headline)
                .padding(.horizontal, 16)

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 10) {
                    ForEach(model.categories) { category in
                        NavigationLink(value: category) {
                            Text(category.name)
                                .font(.system(size: 13, weight: .medium))
                                .foregroundColor(Brand.ink)
                                .padding(.horizontal, 14)
                                .padding(.vertical, 10)
                                .background(Color.white)
                                .clipShape(Capsule())
                                .overlay(Capsule().strokeBorder(Brand.sandDeep, lineWidth: 1))
                        }
                    }
                }
                .padding(.horizontal, 16)
            }
        }
    }

    private func section(title: String, products: [ProductCard]) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(title)
                .font(.headline)
                .padding(.horizontal, 16)

            if products.isEmpty {
                Text(model.isLoading ? state.t("loading") : state.t("noListings"))
                    .font(.subheadline)
                    .foregroundColor(Brand.muted)
                    .padding(.horizontal, 16)
            } else {
                LazyVGrid(columns: columns, spacing: 12) {
                    ForEach(products) { product in
                        ProductCardView(product: product)
                    }
                }
                .padding(.horizontal, 16)
            }
        }
    }

    private func offlineNotice(_ message: String) -> some View {
        HStack(spacing: 10) {
            Image(systemName: "wifi.exclamationmark")
            Text(message).font(.footnote)
            Spacer()
            Button(state.t("retry")) {
                Task { await model.load(language: state.language, countryId: state.countryId) }
            }
            .font(.footnote.bold())
        }
        .padding(12)
        .background(Brand.sun.opacity(0.25))
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .padding(.horizontal, 16)
    }

    /// A slide can point at a category, a search, a listing or a path.
    private func open(_ ad: HomeAd) {
        Task { await API.recordAdClick(ad.id) }
        guard let type = ad.targetType else { return }
        switch type {
        case "category":
            if let match = model.categories.first(where: { $0.slug == ad.targetValue }) {
                path.append(match)
            }
        case "product":
            if let value = ad.targetValue, let ref = Int(value) {
                path.append(ref)
            }
        default:
            // A search or a web page: nothing to push, the slide is just a poster.
            break
        }
    }
}
