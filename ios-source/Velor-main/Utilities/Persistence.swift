//
//  Persistence.swift
//  Velor
//
//  Created by Shatilovich.R on 12.12.2025.
//

import Foundation

enum PersistKeys {
    static let stopwatchesState = "stopwatchesState_v1"
}

struct PersistedStopwatch: Codable {
    var elapsedSeconds: Int
    var isRunning: Bool
    var startedAt: Date?
    var baseElapsedSeconds: Int
}

struct PersistedState: Codable {
    var items: [String: PersistedStopwatch]
}
