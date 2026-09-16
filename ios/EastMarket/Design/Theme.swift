import SwiftUI

/// The brand palette, matching the web app's design tokens (web/src/index.css)
/// and the Android theme, so the three apps look like one product.
enum Brand {
    static let acacia = Color(hex: 0x1E6F5C)
    static let acaciaDark = Color(hex: 0x144E41)
    static let clay = Color(hex: 0xB8531A)
    static let clayDark = Color(hex: 0x7D3712)
    static let sun = Color(hex: 0xE9BB63)
    static let navy = Color(hex: 0x1D3F72)
    static let ink = Color(hex: 0x1A1713)
    static let sand = Color(hex: 0xFAF7F2)
    static let sandDeep = Color(hex: 0xF2EDE4)
    static let muted = Color(hex: 0x8A7F70)
    static let whatsapp = Color(hex: 0x25D366)
}

extension Color {
    init(hex: UInt32, alpha: Double = 1) {
        let red = Double((hex >> 16) & 0xFF) / 255
        let green = Double((hex >> 8) & 0xFF) / 255
        let blue = Double(hex & 0xFF) / 255
        self.init(.sRGB, red: red, green: green, blue: blue, opacity: alpha)
    }
}

/// The five promotion themes the backend sends, with the same gradients and
/// button colours as the web carousel and the Android one.
enum AdTheme: String {
    case night, acacia, clay, sun, navy

    init(name: String?) {
        self = AdTheme(rawValue: name ?? "night") ?? .night
    }

    var gradient: LinearGradient {
        let stops: [Color]
        switch self {
        case .night: stops = [Color(hex: 0x040914), Color(hex: 0x0B1630)]
        case .acacia: stops = [Color(hex: 0x061A16), Color(hex: 0x144E41), Color(hex: 0x1E6F5C)]
        case .clay: stops = [Color(hex: 0x281206), Color(hex: 0x7D3712), Color(hex: 0xD9743A)]
        case .sun: stops = [Color(hex: 0x26180A), Color(hex: 0x8B5A24), Color(hex: 0xD4913F)]
        case .navy: stops = [Color(hex: 0x0B1A33), Color(hex: 0x1D3F72), Color(hex: 0x2F63AD)]
        }
        return LinearGradient(colors: stops, startPoint: .topLeading, endPoint: .bottomTrailing)
    }

    /// Contrast-checked pairings: each is at least 5:1 against its slide.
    var ctaBackground: Color {
        switch self {
        case .clay: return .white
        case .sun: return Brand.ink
        default: return Brand.clay
        }
    }

    var ctaForeground: Color {
        switch self {
        case .clay: return Brand.clayDark
        default: return .white
        }
    }
}

/// Pill shape, a border, and a press that presses. Matches the web and Android
/// buttons; the movement is skipped when Reduce Motion is switched on.
struct PillButtonStyle: ButtonStyle {
    var background: Color = Brand.clay
    var foreground: Color = .white
    var border: Color?
    var fullWidth: Bool = false

    @Environment(\.isEnabled) private var isEnabled
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.system(size: 15, weight: .semibold))
            .foregroundColor(foreground)
            .padding(.horizontal, 18)
            .padding(.vertical, 12)
            .frame(maxWidth: fullWidth ? .infinity : nil)
            .background(background.opacity(isEnabled ? 1 : 0.55))
            .clipShape(Capsule())
            .overlay(Capsule().strokeBorder(border ?? background.opacity(0.9), lineWidth: 1))
            .scaleEffect(configuration.isPressed && !reduceMotion ? 0.97 : 1)
            .animation(.easeOut(duration: 0.15), value: configuration.isPressed)
    }
}

/// The quieter button, for secondary actions.
struct OutlinePillButtonStyle: ButtonStyle {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.system(size: 15, weight: .semibold))
            .foregroundColor(Brand.ink)
            .padding(.horizontal, 18)
            .padding(.vertical, 12)
            .background(Color.white)
            .clipShape(Capsule())
            .overlay(Capsule().strokeBorder(Brand.sandDeep, lineWidth: 1))
            .scaleEffect(configuration.isPressed && !reduceMotion ? 0.97 : 1)
            .animation(.easeOut(duration: 0.15), value: configuration.isPressed)
    }
}

extension View {
    /// The rounded card used for listings and panels.
    func cardSurface(cornerRadius: CGFloat = 20) -> some View {
        self
            .background(Color.white)
            .clipShape(RoundedRectangle(cornerRadius: cornerRadius, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                    .strokeBorder(Brand.sandDeep, lineWidth: 1)
            )
    }
}

/// Prices arrive already converted by the backend; this only formats them.
func formatPrice(_ amount: Double, currency: String) -> String {
    let formatter = NumberFormatter()
    formatter.numberStyle = .decimal
    formatter.maximumFractionDigits = amount < 100 ? 2 : 0
    let number = formatter.string(from: NSNumber(value: amount)) ?? String(amount)
    switch currency.uppercased() {
    case "USD": return "$" + number
    case "SLSH": return "SL " + number
    case "ETB": return "Br " + number
    case "KES": return "KSh " + number
    case "DJF": return "DJF " + number
    default: return currency + " " + number
    }
}
