//
//  Haptics.swift
//  Velor
//
//  Created by Shatilovich.R on 12.12.2025.
//

import UIKit

enum Haptics {
    // ✅ Предотвращение спама haptics
    private static var lastHapticTime: [String: Date] = [:]
    private static let minimumInterval: TimeInterval = 0.1

    private static func canTrigger(for key: String) -> Bool {
        guard let last = lastHapticTime[key] else {
            lastHapticTime[key] = Date()
            return true
        }

        let interval = Date().timeIntervalSince(last)
        if interval >= minimumInterval {
            lastHapticTime[key] = Date()
            return true
        }
        return false
    }

    private static func impact(_ style: UIImpactFeedbackGenerator.FeedbackStyle, key: String) {
        guard canTrigger(for: key) else { return }
        let gen = UIImpactFeedbackGenerator(style: style)
        gen.prepare()
        gen.impactOccurred()
    }

    private static func notify(_ type: UINotificationFeedbackGenerator.FeedbackType, key: String) {
        guard canTrigger(for: key) else { return }
        let gen = UINotificationFeedbackGenerator()
        gen.prepare()
        gen.notificationOccurred(type)
    }

    static func tap() {
        impact(.light, key: "tap")
    }

    static func start() {
        impact(.light, key: "start")
    }

    static func pause() {
        impact(.soft, key: "pause")
    }

    static func resetTap() {
        impact(.rigid, key: "resetTap")
    }

    static func warning() {
        notify(.warning, key: "warning")
    }

    static func error() {
        notify(.error, key: "error")
        impact(.heavy, key: "errorHeavy")
    }
}
