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

    private var photo: some View {
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
        .frame(maxWidth: .infinity)
        .aspectRatio(4.0 / 3.0, contentMode: .fit)
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
