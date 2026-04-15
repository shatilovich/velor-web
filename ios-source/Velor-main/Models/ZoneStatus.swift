import SwiftUI

enum ZoneStatus: Equatable {
    case idle
    case paused
    case ok
    case warn
    case danger

    func stroke(for scheme: ColorScheme) -> Color {
        switch self {
        case .idle, .paused:
            return AppColors.borderNeutral(for: scheme, state: self)
        case .ok:
            return AppColors.statusOk
        case .warn:
            return AppColors.statusWarn
        case .danger:
            return AppColors.statusDanger
        }
    }

    func label(for scheme: ColorScheme) -> Color {
        switch self {
        case .warn:   return AppColors.statusWarn
        case .danger: return AppColors.statusDanger
        case .ok:     return AppColors.statusOk
        case .paused: return AppColors.labelNeutral(for: scheme, state: .paused)
        case .idle:   return AppColors.labelNeutral(for: scheme, state: .idle)
        }
    }
}
