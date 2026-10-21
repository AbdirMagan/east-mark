import SwiftUI

/// A listing card: rounded, a 4:3 photo, price, title, place, and a Buy button
/// that opens the listing. Same shape as the web and Android cards.
struct ProductCardView: View {
    let product: ProductCard
    @EnvironmentObject private var state: AppState

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            ZStack(alignment: .topLeading) {
                photo

                // A badge, not a player: a scrolling grid that autoplays video
                // would spend a buyer's data bundle before a single tap.
                if product.hasVideo == true {
                    HStack(spacing: 3) {
                        Image(systemName: "play.fill").font(.system(size: 8))
                        Text(state.t("video")).font(.system(size: 10, weight: .bold))
                    }
                    .foregroundColor(.white)
                    .padding(.horizontal, 6)
                    .padding(.vertical, 3)
                    .background(Color.black.opacity(0.65))
                    .clipShape(Capsule())
                    .padding(8)
                    .frame(maxWidth: .infinity, alignment: .trailing)
                }

                if product.featured {
                    Text("★")
                        .font(.caption2.bold())
                        .padding(6)
                        .background(Brand.sun)
                        .clipShape(Circle())
                        .padding(8)
                }
            }

            VStack(alignment: .leading, spacing: 4) {
                Text(formatPrice(product.price, currency: product.currency))
                    .font(.system(size: 15, weight: .bold))
                    .foregroundColor(Brand.ink)

                Text(product.title)
                    .font(.system(size: 13))
                    .foregroundColor(Brand.ink.opacity(0.75))
                    .lineLimit(2)
                    .frame(height: 34, alignment: .top)

                HStack(spacing: 4) {
                    Image(systemName: "mappin.and.ellipse")
                        .font(.system(size: 10))
                    Text(product.city ?? "—")
                        .font(.system(size: 11))
                        .lineLimit(1)
                }
                .foregroundColor(Brand.muted)

                NavigationLink(value: product.ref) {
                    HStack(spacing: 6) {
                        Image(systemName: "cart")
                        Text(state.t("buy"))
                    }
                }
                .buttonStyle(PillButtonStyle(fullWidth: true))
                .padding(.top, 6)
            }
            .padding(12)
        }
        .cardSurface()
    }

    /// A 4:3 box the width of the card, which the photo fills and is cropped to.
    ///
    /// The order of these modifiers is the whole point, and the obvious order is
    /// wrong. Sizing the image first with `.frame(maxWidth: .infinity)` and then
    /// asking for an aspect ratio lets the ratio re-propose a width from the
    /// height it is offered -- and inside a `LazyVGrid` the offered height is
    /// unbounded, so the card can come out wider than its column and run off the
    /// side of the screen. `.clipped()` is no help there: by then it is clipping
    /// to the oversized frame, not to the column.
    ///
    /// Sizing an empty `Color` first pins the box to the width the grid actually
    /// gave the card. The photo is laid over a box whose size is already settled,
    /// so there is nothing left for it to negotiate.
    private var photo: some View {
        Color.clear
            .aspectRatio(4.0 / 3.0, contentMode: .fit)
            .overlay(
                Group {
                    if let image = product.displayImage, let url = URL(string: image) {
                        AsyncImage(url: url) { phase in
                            switch phase {
                            case .success(let image):
                                image.resizable().scaledToFill()
                            case .failure:
                                placeholder
                            default:
                                placeholder.overlay(ProgressView())
                            }
                        }
                    } else {
                        placeholder
                    }
                }
            )
            .clipped()
    }

    private var placeholder: some View {
        Brand.sandDeep.overlay(
            Image(systemName: "photo")
                .font(.title3)
                .foregroundColor(Brand.muted)
        )
    }
}
