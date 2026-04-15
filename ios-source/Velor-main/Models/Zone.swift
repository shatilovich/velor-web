import Foundation
import CoreGraphics

enum Zone: String, CaseIterable, Identifiable {
    case lashLeft, lashRight, browLeft, browRight

    var id: String { rawValue }

    var title: String {
        switch self {
        case .lashLeft:  return "Левая\nресница"
        case .lashRight: return "Правая\nресница"
        case .browLeft:  return "Левая\nбровь"
        case .browRight: return "Правая\nбровь"
        }
    }

    var subtitle: String {
        switch self {
        case .lashLeft, .lashRight: return "Ресницы"
        case .browLeft, .browRight: return "Брови"
        }
    }

    var limitKey: String { "limitSeconds_\(rawValue)" }

    var defaultLimitSeconds: Int {
        switch self {
        case .lashLeft, .lashRight: return 10 * 60
        case .browLeft, .browRight: return 6 * 60
        }
    }

    /// Relative position on face canvas (0...1)
    var faceAnchor: CGPoint {
        switch self {
        case .lashLeft:  return CGPoint(x: 0.32, y: 0.42)
        case .lashRight: return CGPoint(x: 0.68, y: 0.42)
        case .browLeft:  return CGPoint(x: 0.32, y: 0.33)
        case .browRight: return CGPoint(x: 0.68, y: 0.33)
        }
    }
}
