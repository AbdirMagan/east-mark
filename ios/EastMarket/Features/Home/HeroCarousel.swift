import SwiftUI

/// The home carousel: the promotions staff post in the admin dashboard, the
/// same slides the web hero and the Android carousel show. Auto-advances every
/// six seconds unless Reduce Motion is on, and a tap opens what it advertises.
struct HeroCarousel: View {
    let ads: [HomeAd]
    let onSelect: (HomeAd) -> Void

    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var index = 0

    var body: some View {
        TabView(selection: $index) {
            ForEach(Array(ads.enumerated()), id: \.element.id) { position, ad in
                slide(ad)
                    .tag(position)
                    .onTapGesture { onSelect(ad) }
            }
        }
        .tabViewStyle(.page(indexDisplayMode: .always))
        .frame(height: 210)
        .task(id: ads.count) {
            guard ads.count > 1, !reduceMotion else { return }
            while !Task.isCancelled {
                try? await Task.sleep(nanoseconds: 6_000_000_000)
                if Task.isCancelled { return }
                withAnimation { index = (index + 1) % max(ads.count, 1) }
            }
        }
    }

    private func slide(_ ad: HomeAd) -> some View {
        let theme = AdTheme(name: ad.theme)
        return ZStack {
            theme.gradient

            if let image = ad.imageUrl, let url = URL(string: image) {
                AsyncImage(url: url) { phase in
                    if case .success(let loaded) = phase {
                        loaded.resizable().scaledToFill()
                    } else {
                        Color.clear
                    }
                }
                .clipped()
                // Keeps the words readable whatever the advertiser uploaded.
                .overlay(
                    LinearGradient(
                        colors: [Color.black.opacity(0.85), Color.black.opacity(0.3)],
                        startPoint: .leading,
                        endPoint: .trailing
                    )
                )
            }

            VStack(alignment: .leading, spacing: 8) {
                if let badge = ad.badge, !badge.isEmpty {
                    Text(badge.uppercased())
                        .font(.system(size: 11, weight: .black))
                        .foregroundColor(Brand.ink)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(Brand.sun)
                        .clipShape(RoundedRectangle(cornerRadius: 6))
                        .rotationEffect(.degrees(-2))
                }

                Text(ad.title)
                    .font(.system(size: 20, weight: .black))
                    .foregroundColor(.white)
                    .lineLimit(2)

                if let subtitle = ad.subtitle, !subtitle.isEmpty {
                    Text(subtitle)
                        .font(.system(size: 12))
                        .foregroundColor(.white.opacity(0.85))
                        .lineLimit(2)
                }

                if let label = ad.ctaLabel, !label.isEmpty {
                    Button(action: { onSelect(ad) }) {
                        Text(label)
                    }
                    .buttonStyle(
                        PillButtonStyle(
                            background: theme.ctaBackground,
                            foreground: theme.ctaForeground,
                            border: Color.white.opacity(0.25)
                        )
                    )
                    .padding(.top, 2)
                }
            }
            .padding(18)
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
        }
        .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
        .padding(.horizontal, 12)
        .padding(.bottom, 28)
        .accessibilityElement(children: .combine)
    }
}
