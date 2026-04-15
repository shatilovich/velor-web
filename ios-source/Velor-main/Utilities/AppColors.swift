import SwiftUI

enum AppColors {
    // Neutral borders
    static let borderNeutralLight = Color(red: 230/255, green: 230/255, blue: 230/255) // #E6E6E6

    // System-derived (kept centralized here)
    static let separator = Color(uiColor: .separator)

    // Card surface (strict)
    static let cardSurfaceLight = Color(.sRGB, red: 242/255, green: 242/255, blue: 247/255, opacity: 1) // #F2F2F7
    static let cardSurfaceDark  = Color(.sRGB, red: 28/255,  green: 28/255,  blue: 30/255,  opacity: 1) // #1C1C1E

    static func cardSurface(for scheme: ColorScheme) -> Color {
        scheme == .dark ? cardSurfaceDark : cardSurfaceLight
    }

    // Background / Primary (strict, sRGB)
    static let backgroundPrimaryLight = Color(.sRGB, red: 1, green: 1, blue: 1, opacity: 1) // #FFFFFF
    static let backgroundPrimaryDark  = Color(.sRGB, red: 0, green: 0, blue: 0, opacity: 1) // #000000

    static func backgroundPrimary(for scheme: ColorScheme) -> Color {
        scheme == .dark ? backgroundPrimaryDark : backgroundPrimaryLight
    }

    // Status colors
    static let statusOk = Color.green
    static let statusWarn = Color.orange
    static let statusDanger = Color.red

    // Opacities & strokes (design tokens)
    static let opacityBorderSubtle: Double = 0.25
    static let opacityBorderDefault: Double = 0.35
    static let opacityDivider: Double = 0.55
    static let opacityPressedFill: Double = 0.08
    static let shadowOpacityFallback: Double = 0.12

    static let strokeWidthHairline: CGFloat = 1
    static let strokeWidthAccent: CGFloat = 2
    static let ringLineWidth: CGFloat = 5

    // Neutral text/border opacities (theme tokens)
    static let opacityNeutralIdleLight: Double = 0.12
    static let opacityNeutralPausedLight: Double = 0.20
    static let opacityNeutralIdleDark: Double = 0.12
    static let opacityNeutralPausedDark: Double = 0.20

    static let opacityLabelIdleLight: Double = 0.45
    static let opacityLabelPausedLight: Double = 0.55
    static let opacityLabelIdleDark: Double = 0.55
    static let opacityLabelPausedDark: Double = 0.70

    // Helpers
    static func borderNeutral(for scheme: ColorScheme, state: ZoneStatus) -> Color {
        switch (scheme, state) {
        case (.light, .paused):
            return Color.primary.opacity(opacityNeutralPausedLight)
        case (.light, _):
            return Color.primary.opacity(opacityNeutralIdleLight)
        case (.dark, .paused):
            return Color.primary.opacity(opacityNeutralPausedDark)
        default:
            return Color.primary.opacity(opacityNeutralIdleDark)
        }
    }

    static func labelNeutral(for scheme: ColorScheme, state: ZoneStatus) -> Color {
        switch (scheme, state) {
        case (.light, .paused):
            return Color.primary.opacity(opacityLabelPausedLight)
        case (.light, _):
            return Color.primary.opacity(opacityLabelIdleLight)
        case (.dark, .paused):
            return Color.primary.opacity(opacityLabelPausedDark)
        default:
            return Color.primary.opacity(opacityLabelIdleDark)
        }
    }

    static func ringTrackStroke() -> Color { separator.opacity(opacityBorderSubtle) }

    static func strokeSeparatorSubtle() -> Color { separator.opacity(opacityBorderSubtle) }
    static func strokeSeparatorDefault() -> Color { separator.opacity(opacityBorderDefault) }
    static func divider() -> Color { separator.opacity(opacityDivider) }
}

extension View {
    @ViewBuilder
    func preferredColorSchemeIfNeeded(_ scheme: ColorScheme?) -> some View {
        if let scheme {
            self.preferredColorScheme(scheme)
        } else {
            self
        }
    }
}
