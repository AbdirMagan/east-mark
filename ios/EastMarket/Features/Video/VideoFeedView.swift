import AVKit
import SwiftUI

/// Route values for the two ways to browse, pushed from the home screen.
struct VideoFeedRoute: Hashable {}

enum BrowseRoute: Hashable {
    case photos
}

/// Listings that were filmed, one per screen, swiped vertically.
///
/// It is pushed inside the Home tab, so the app's own navigation bar and tab
/// bar stay where they are: someone who arrives here is still shopping, and a
/// feed you have to back out of is a dead end. The category strip sits under
/// the bar and stays put while the videos scroll beneath it.
///
/// Only the visible page plays. Each slide checks whether it is the current one
/// before it touches the network — on a metered bundle, videos buffering ahead
/// of a buyer who swiped past them is money spent for nothing.
@MainActor
final class VideoFeedViewModel: ObservableObject {
    @Published var items: [ProductCard] = []
    @Published var categories: [Category] = []
    @Published var categoryId: Int?
    @Published var isLoading = false

    func load(language: AppLanguage, countryId: Int?) async {
        isLoading = true
        defer { isLoading = false }

        if categories.isEmpty {
            categories = (try? await API.categories(lang: language.rawValue)) ?? []
        }

        let loaded = (try? await API.products(
            categoryId: categoryId,
            countryId: countryId,
            media: "video",
            sort: "newest",
            limit: 30
        )) ?? []
        items = loaded.filter { $0.videoUrl != nil }
    }
}

struct VideoFeedView: View {
    @EnvironmentObject private var state: AppState
    @StateObject private var model = VideoFeedViewModel()
    @State private var muted = true
    /// The listing on screen. Every other slide stays paused and unloaded --
    /// videos buffering ahead of a buyer who swiped past them is money spent
    /// for nothing on a metered bundle.
    @State private var current: String = ""

    var body: some View {
        VStack(spacing: 0) {
            categoryStrip

            GeometryReader { geometry in
                if model.isLoading && model.items.isEmpty {
                    ProgressView()
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                        .background(Brand.sand)
                } else if model.items.isEmpty {
                    VStack(spacing: 10) {
                        Image(systemName: "play.slash")
                            .font(.largeTitle)
                            .foregroundColor(Brand.muted)
                        Text(state.t("noVideos"))
                            .font(.subheadline.bold())
                            .foregroundColor(Brand.muted)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .background(Brand.sand)
                } else {
                    // A paging ScrollView is the closest iOS 16 equivalent of a
                    // vertical pager: one listing settles into place per swipe.
                    TabView(selection: $current) {
                        ForEach(model.items) { product in
                            VideoFeedSlide(
                                product: product,
                                muted: $muted,
                                isCurrent: current == product.id
                            )
                            .frame(width: geometry.size.width, height: geometry.size.height)
                            .rotationEffect(.degrees(-90))
                            .tag(product.id)
                        }
                    }
                    .frame(width: geometry.size.height, height: geometry.size.width)
                    .rotationEffect(.degrees(90), anchor: .topLeading)
                    .offset(x: geometry.size.width)
                    .tabViewStyle(.page(indexDisplayMode: .never))
                }
            }
        }
        .background(Brand.sand)
        .navigationTitle(state.t("videoListings"))
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                Button {
                    muted.toggle()
                } label: {
                    Image(systemName: muted ? "speaker.slash.fill" : "speaker.wave.2.fill")
                }
                .accessibilityLabel(state.t(muted ? "soundOn" : "soundOff"))
            }
        }
        .task(id: state.language) {
            await model.load(language: state.language, countryId: state.countryId)
            if current.isEmpty { current = model.items.first?.id ?? "" }
        }
        .onChange(of: model.items) { items in
            // A category filter replaces the list; start at the top of the new one.
            if !items.contains(where: { $0.id == current }) {
                current = items.first?.id ?? ""
            }
        }
    }

    private var categoryStrip: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                chip(title: state.t("categories"), selected: model.categoryId == nil) {
                    model.categoryId = nil
                    Task { await model.load(language: state.language, countryId: state.countryId) }
                }

                ForEach(model.categories) { category in
                    chip(title: category.name, selected: model.categoryId == category.id) {
                        model.categoryId = model.categoryId == category.id ? nil : category.id
                        Task {
                            await model.load(language: state.language, countryId: state.countryId)
                        }
                    }
                }
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 8)
        }
        .background(Color.white)
    }

    private func chip(title: String, selected: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text(title)
                .font(.system(size: 13, weight: .semibold))
                .foregroundColor(selected ? .white : Brand.ink)
                .padding(.horizontal, 14)
                .padding(.vertical, 9)
                .background(selected ? Brand.navy : Color.white)
                .clipShape(Capsule())
                .overlay(Capsule().strokeBorder(selected ? Brand.navy : Brand.sandDeep, lineWidth: 1))
        }
    }
}

private struct VideoFeedSlide: View {
    let product: ProductCard
    @Binding var muted: Bool
    let isCurrent: Bool

    @EnvironmentObject private var state: AppState
    @State private var player: AVPlayer?

    var body: some View {
        ZStack {
            // The app's own background, so the edge of a video that cannot fill
            // the slide reads as part of the app rather than as a black hole.
            Brand.sand.ignoresSafeArea()

            if let player {
                VideoPlayer(player: player)
                    .disabled(true)
                    .onAppear {
                        player.isMuted = muted
                        player.play()
                    }
                    .onDisappear { player.pause() }
                    .onChange(of: muted) { value in player.isMuted = value }
            } else {
                AsyncImage(url: URL(string: product.videoPosterUrl ?? product.displayImage ?? "")) { phase in
                    if case .success(let image) = phase {
                        image.resizable().scaledToFill()
                    } else {
                        Brand.sandDeep
                    }
                }
                .clipped()

                Image(systemName: "play.circle.fill")
                    .font(.system(size: 56))
                    .foregroundColor(.white)
                    .shadow(radius: 6)
            }

            VStack {
                Spacer()
                LinearGradient(
                    colors: [.clear, .black.opacity(0.85)],
                    startPoint: .top,
                    endPoint: .bottom
                )
                .frame(height: 210)
                .allowsHitTesting(false)
            }

            VStack {
                Spacer()
                details
            }
        }
        .clipped()
        .contentShape(Rectangle())
        .onTapGesture {
            guard let player else { return start() }
            if player.timeControlStatus == .playing { player.pause() } else { player.play() }
        }
        .onAppear { if isCurrent { start() } }
        .onChange(of: isCurrent) { showing in
            if showing {
                start()
            } else {
                // Swiping away stops playback and lets the buffer go; swiping
                // back starts from the top rather than mid-sentence.
                player?.pause()
                player?.seek(to: .zero)
            }
        }
    }

    private var details: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(formatPrice(product.price, currency: product.currency))
                .font(.system(size: 22, weight: .black))
                .foregroundColor(.white)

            Text(product.title)
                .font(.system(size: 14, weight: .semibold))
                .foregroundColor(.white)
                .lineLimit(2)

            HStack(spacing: 4) {
                Image(systemName: "mappin.and.ellipse").font(.system(size: 10))
                Text("\(product.city ?? "—") · \(product.seller.name)")
                    .font(.system(size: 12))
            }
            .foregroundColor(.white.opacity(0.75))

            HStack(spacing: 8) {
                NavigationLink(value: product.ref) {
                    Label(state.t("buy"), systemImage: "cart")
                        .font(.system(size: 13, weight: .bold))
                        .foregroundColor(.black)
                        .padding(.horizontal, 16)
                        .padding(.vertical, 10)
                        .background(Color.white)
                        .clipShape(Capsule())
                }

                NavigationLink(value: product.ref) {
                    Label(state.t("message"), systemImage: "bubble.left")
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundColor(.white)
                        .padding(.horizontal, 16)
                        .padding(.vertical, 10)
                        .overlay(Capsule().strokeBorder(Color.white.opacity(0.5), lineWidth: 1))
                }

                Spacer()

                Button {
                    muted.toggle()
                } label: {
                    Image(systemName: muted ? "speaker.slash.fill" : "speaker.wave.2.fill")
                        .foregroundColor(.white)
                        .padding(10)
                        .overlay(Circle().strokeBorder(Color.white.opacity(0.4), lineWidth: 1))
                }
                .accessibilityLabel(state.t(muted ? "soundOn" : "soundOff"))
            }
            .padding(.top, 8)
        }
        .padding(16)
    }

    private func start() {
        guard player == nil, let url = URL(string: product.videoUrl ?? "") else { return }
        let created = AVPlayer(url: url)
        created.isMuted = muted
        // Loop, the way every short-video app does.
        NotificationCenter.default.addObserver(
            forName: .AVPlayerItemDidPlayToEndTime,
            object: created.currentItem,
            queue: .main
        ) { _ in
            created.seek(to: .zero)
            created.play()
        }
        player = created
        created.play()
    }
}
